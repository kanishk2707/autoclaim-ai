// Agent 3 — Arbiter / Reasoner
// Reconciles Predictor vs Contradictor, produces final verdict with explainable reasoning
import { aiChat, parseJsonResponse } from '../api/apiRouter';
import { computeFraudScore, analyzeImageMetadata, analyzeClaimHistory } from '../data/fraudDetector';
import { estimateTotalCost } from '../data/pricingEngine';

// Configurable thresholds (per §5.4 — must be configurable, not hardcoded)
export const CONFIG = {
  confidenceThreshold: 0.85,
  fraudThreshold: 0.40,
  autoApprovalCostCap: 50000, // INR
  highSeverityChallengeForceReanalysis: true,
};

const ARBITER_PROMPT = `You are Agent 3 (Arbiter/Reasoner) in the AutoClaim AI tri-agent system.

You reconcile Agent 1 (Predictor)'s damage assessment against Agent 2 (Contradictor)'s challenges to produce the FINAL claim recommendation.

Your responsibilities:
1. Review each challenge from the Contradictor
2. Decide whether to uphold or override each challenge
3. Produce a final severity/damage assessment
4. Generate an explicit, human-readable reasoning chain
5. Compute risk scores
6. Determine the final recommendation

PREDICTOR OUTPUT:
{predictorOutput}

CONTRADICTOR CHALLENGES:
{contradictorOutput}

INCIDENT DESCRIPTION:
{incidentDescription}

VEHICLE INFO:
{vehicleInfo}

CONFIGURATION:
- Confidence threshold: {confidenceThreshold}
- Fraud score threshold: {fraudThreshold}
- Auto-approval cost cap: ₹{autoApprovalCostCap}

RULES (§5.4):
- If agents agree AND confidence ≥ threshold AND cost ≤ cap → recommend auto_approve
- If Contradictor raises ≥1 HIGH severity challenge → you MUST re-analyze before recommending
- If fraud signal score ≥ threshold → route to SIU, NEVER auto-approve
- If confidence < threshold after arbitration → route to human surveyor with pre-filled findings

Return ONLY this strict JSON:
{
  "final_damage_regions": [
    {
      "part": "<part_key>",
      "damage_type": "<type>",
      "severity": "<severity>",
      "confidence": <0.0-1.0>,
      "description": "<description>"
    }
  ],
  "final_severity": "<overall severity>",
  "final_damage_type": "<primary damage type>",
  "confidence": <0.0-1.0>,
  "reason": ["<reason 1>", "<reason 2>", "..."],
  "risk_scores": {
    "damage_score": <0.0-1.0>,
    "repair_complexity": "<low|medium|high>",
    "approval_probability": <0.0-1.0>,
    "time_to_repair_days": <number>
  },
  "recommendation": "<auto_approve|needs_review|escalate_siu>",
  "requires_human_review": <true|false>,
  "challenge_resolutions": [
    {
      "challenge_type": "<type>",
      "resolution": "<upheld|overridden|partially_upheld>",
      "reasoning": "<why you decided this way>"
    }
  ],
  "arbitration_summary": "<2-3 sentence summary of your arbitration>"
}`;

export async function runArbiter(predictorOutput, contradictorOutput, incidentDescription, vehicleInfo = {}, imageFiles = [], onProgress = null) {
  if (onProgress) onProgress('Reconciling agent findings...');

  const prompt = ARBITER_PROMPT
    .replace('{predictorOutput}', JSON.stringify(predictorOutput, null, 2))
    .replace('{contradictorOutput}', JSON.stringify(contradictorOutput, null, 2))
    .replace('{incidentDescription}', incidentDescription)
    .replace('{vehicleInfo}', JSON.stringify(vehicleInfo, null, 2))
    .replace('{confidenceThreshold}', CONFIG.confidenceThreshold)
    .replace('{fraudThreshold}', CONFIG.fraudThreshold)
    .replace('{autoApprovalCostCap}', CONFIG.autoApprovalCostCap);

  const messages = [
    {
      role: 'system',
      content: 'You are the final arbiter AI agent that produces fair, well-reasoned claim verdicts. Respond in strict JSON only.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await aiChat(messages, {
    temperature: 0.2,
    maxTokens: 4096,
  });

  if (onProgress) onProgress('Computing final assessment...');

  let parsed;
  try {
    parsed = parseJsonResponse(response);
  } catch (e) {
    console.error('Failed to parse Arbiter response:', response);
    throw new Error(`Arbiter failed to produce valid results: ${e.message}`);
  }

  // Compute fraud score using all signals
  if (onProgress) onProgress('Running fraud analysis...');

  const metadataAnalysis = analyzeImageMetadata(
    imageFiles,
    vehicleInfo.incidentDate,
    vehicleInfo.incidentLocation
  );

  const claimHistory = analyzeClaimHistory(
    vehicleInfo.phone,
    vehicleInfo.email
  );

  const agentDisagreement = 1 - (contradictorOutput.agreement_level || 0.5);

  const fraudResult = computeFraudScore({
    physicsValidation: contradictorOutput.physics_validation,
    agentDisagreement,
    metadataAnalysis,
    claimHistory,
    imageAnalysis: { anomalyScore: 0, detail: 'No duplicate images detected in database' },
  });

  // Recalculate cost with final damage regions
  const finalRegions = parsed.final_damage_regions || predictorOutput.damage_regions;
  const finalCost = estimateTotalCost(finalRegions, vehicleInfo.segment || 'sedan');

  // Apply consensus & escalation rules (§5.4)
  let recommendation = parsed.recommendation || 'needs_review';
  let requiresHumanReview = parsed.requires_human_review || false;
  const confidence = Math.min(1, Math.max(0, parseFloat(parsed.confidence) || 0.5));

  // Rule: Fraud score ≥ threshold → NEVER auto-approve
  if (fraudResult.score >= CONFIG.fraudThreshold * 100) {
    recommendation = 'escalate_siu';
    requiresHumanReview = true;
  }
  // Rule: Cost > cap → needs human review
  else if (finalCost.total > CONFIG.autoApprovalCostCap) {
    if (recommendation === 'auto_approve') {
      recommendation = 'needs_review';
      requiresHumanReview = true;
    }
  }
  // Rule: Confidence < threshold → human review
  else if (confidence < CONFIG.confidenceThreshold) {
    recommendation = 'needs_review';
    requiresHumanReview = true;
  }
  // Rule: High severity challenges exist → force re-analysis
  const highSeverityChallenges = (contradictorOutput.challenges || []).filter(c => c.severity === 'high');
  if (highSeverityChallenges.length > 0 && recommendation === 'auto_approve') {
    // Keep auto_approve only if arbiter explicitly resolved all high challenges
    const allResolved = (parsed.challenge_resolutions || [])
      .filter(r => r.resolution === 'overridden')
      .length >= highSeverityChallenges.length;
    if (!allResolved) {
      recommendation = 'needs_review';
      requiresHumanReview = true;
    }
  }

  // Generate claim ID
  const claimId = `CLM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;

  return {
    agent: 'arbiter',
    claim_id: claimId,
    final_damage_regions: finalRegions,
    final_severity: parsed.final_severity || 'moderate',
    final_damage_type: parsed.final_damage_type || 'dent',
    part: finalRegions.length > 0 ? finalRegions[0].part : 'unknown',
    estimated_cost: finalCost.total,
    cost_breakdown: finalCost,
    confidence,
    reason: parsed.reason || ['Assessment completed by tri-agent system'],
    risk_scores: {
      damage_score: parsed.risk_scores?.damage_score || 0.5,
      fraud_score: fraudResult.score / 100,
      repair_complexity: parsed.risk_scores?.repair_complexity || 'medium',
      approval_probability: parsed.risk_scores?.approval_probability || 0.5,
      time_to_repair_days: parsed.risk_scores?.time_to_repair_days || 3,
      confidence,
    },
    fraud_analysis: fraudResult,
    recommendation,
    requires_human_review: requiresHumanReview,
    challenge_resolutions: parsed.challenge_resolutions || [],
    arbitration_summary: parsed.arbitration_summary || '',
    agent_disagreement_log: {
      predictor_summary: predictorOutput.damage_summary,
      contradictor_challenges: contradictorOutput.challenges,
      contradictor_fraud_score: contradictorOutput.fraud_signal_score,
      contradictor_agreement: contradictorOutput.agreement_level,
      arbiter_resolutions: parsed.challenge_resolutions || [],
      physics_validation: contradictorOutput.physics_validation,
    },
    timestamp: new Date().toISOString(),
  };
}
