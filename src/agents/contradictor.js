// Agent 2 — Contradictor / Challenger
// Adversarially stress-tests Predictor output — anti-hallucination layer
import { aiChat, parseJsonResponse } from '../api/apiRouter';
import { validateCollisionPhysics } from '../data/physicsEngine';

const CONTRADICTOR_PROMPT = `You are Agent 2 (Contradictor/Challenger) in the AutoClaim AI tri-agent system.

Your role is to ADVERSARIALLY stress-test Agent 1 (Predictor)'s damage assessment. You are NOT confirming the prediction — you are actively looking for problems, inconsistencies, and potential fraud signals.

You MUST run these checks:

1. **Confidence Threshold Challenge**: Flag any damage region with confidence < 0.85 for re-examination
2. **Cross-Image Consistency**: Does the damage assessment make physical sense? Could damage appear in one area but not adjacent areas?
3. **Physics Consistency**: Does the deformation pattern match the claimed incident? (Physics validation data provided below)
4. **Severity-Cost Challenge**: Is the severity rating appropriate for the described damage? Is the cost estimate reasonable?
5. **Damage Type Validation**: Is the damage type classification correct? Could a "scratch" actually be a "crack"?
6. **Story Plausibility**: Does the customer's incident description match the damage pattern?

PREDICTOR OUTPUT:
{predictorOutput}

INCIDENT DESCRIPTION:
{incidentDescription}

PHYSICS VALIDATION:
{physicsValidation}

VEHICLE INFO:
{vehicleInfo}

Return ONLY this strict JSON (no markdown):
{
  "challenges": [
    {
      "type": "<challenge_type>",
      "region_id": "<region_id if applicable, null otherwise>",
      "detail": "<specific, actionable challenge description>",
      "severity": "<low|medium|high>",
      "suggested_action": "<what should be reconsidered>"
    }
  ],
  "fraud_signal_score": <0.0-1.0>,
  "fraud_signals": ["<list of specific fraud indicators found, empty if none>"],
  "overall_assessment": "<your overall adversarial assessment of the claim>",
  "agreement_level": <0.0-1.0 where 1.0 means you fully agree with Predictor>
}

Challenge types: low_confidence_region, physics_inconsistency, severity_mismatch, damage_type_mismatch, cost_anomaly, story_inconsistency, metadata_anomaly, extent_anomaly

Be rigorous but fair. Flag genuine issues, not manufactured problems.`;

export async function runContradictor(predictorOutput, incidentDescription, vehicleInfo = {}, onProgress = null) {
  if (onProgress) onProgress('Running physics validation engine...');

  // Run physics validation
  const physicsResult = validateCollisionPhysics(
    predictorOutput.damage_regions,
    incidentDescription
  );

  if (onProgress) onProgress('Challenging Predictor findings adversarially...');

  const prompt = CONTRADICTOR_PROMPT
    .replace('{predictorOutput}', JSON.stringify(predictorOutput, null, 2))
    .replace('{incidentDescription}', incidentDescription)
    .replace('{physicsValidation}', JSON.stringify(physicsResult, null, 2))
    .replace('{vehicleInfo}', JSON.stringify(vehicleInfo, null, 2));

  const messages = [
    {
      role: 'system',
      content: 'You are a rigorous adversarial AI agent that challenges damage assessments. Always respond in strict JSON format only.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const response = await aiChat(messages, {
    temperature: 0.25,
    maxTokens: 4096,
  });

  if (onProgress) onProgress('Parsing adversarial challenges...');

  let parsed;
  try {
    parsed = parseJsonResponse(response);
  } catch (e) {
    console.error('Failed to parse Contradictor response:', response);
    // Return minimal challenges on parse failure
    parsed = {
      challenges: [],
      fraud_signal_score: 0.1,
      fraud_signals: [],
      overall_assessment: 'Unable to complete adversarial analysis',
      agreement_level: 0.7,
    };
  }

  // Add physics engine challenges to the list
  if (physicsResult.inconsistencies.length > 0) {
    for (const inc of physicsResult.inconsistencies) {
      const exists = (parsed.challenges || []).some(c =>
        c.type === 'physics_inconsistency' && c.detail.includes(inc.detail.substring(0, 30))
      );
      if (!exists) {
        parsed.challenges = parsed.challenges || [];
        parsed.challenges.push({
          type: 'physics_inconsistency',
          region_id: null,
          detail: inc.detail,
          severity: inc.severity,
          suggested_action: 'Verify incident description matches physical damage pattern',
        });
      }
    }
  }

  // Auto-flag low confidence regions
  for (const region of predictorOutput.damage_regions) {
    if (region.confidence < 0.85) {
      const exists = (parsed.challenges || []).some(c =>
        c.type === 'low_confidence_region' && c.region_id === region.id
      );
      if (!exists) {
        parsed.challenges = parsed.challenges || [];
        parsed.challenges.push({
          type: 'low_confidence_region',
          region_id: region.id,
          detail: `Region ${region.id} (${region.part}) has confidence ${(region.confidence * 100).toFixed(0)}% — below 85% threshold`,
          severity: region.confidence < 0.6 ? 'high' : 'medium',
          suggested_action: 'Re-examine this region with additional images if available',
        });
      }
    }
  }

  return {
    agent: 'contradictor',
    challenges: parsed.challenges || [],
    fraud_signal_score: Math.min(1, Math.max(0, parseFloat(parsed.fraud_signal_score) || 0)),
    fraud_signals: parsed.fraud_signals || [],
    overall_assessment: parsed.overall_assessment || '',
    agreement_level: Math.min(1, Math.max(0, parseFloat(parsed.agreement_level) || 0.5)),
    physics_validation: physicsResult,
    timestamp: new Date().toISOString(),
  };
}
