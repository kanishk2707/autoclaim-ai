// Tri-Agent Orchestrator
// Coordinates Predictor → Contradictor → Arbiter pipeline with progress streaming
import { runPredictor } from './predictor';
import { runContradictor } from './contradictor';
import { runArbiter } from './arbiter';

/**
 * Run the full tri-agent adjudication pipeline
 *
 * @param {Object} params
 * @param {File[]} params.images - Damage photos
 * @param {string} params.incidentDescription - Customer's incident description
 * @param {Object} params.vehicleInfo - Vehicle details
 * @param {Function} params.onProgress - Progress callback (stage, message, agentIndex)
 * @returns {Object} Complete claim assessment result
 */
export async function runTriAgentPipeline({
  images,
  incidentDescription,
  vehicleInfo = {},
  onProgress = () => {},
}) {
  const startTime = Date.now();
  const agentLogs = [];
  const validImages = (images || []).filter(img => typeof img === 'string' && img !== '[base64-stripped]' && img.trim() !== '');

  try {
    // ─── Stage 1: Predictor ───
    onProgress('predictor', 'Starting damage analysis...', 0);
    agentLogs.push({ agent: 'predictor', status: 'running', startedAt: new Date().toISOString() });

    const predictorResult = await runPredictor(
      validImages,
      vehicleInfo,
      (msg) => onProgress('predictor', msg, 0)
    );

    agentLogs[0].status = 'completed';
    agentLogs[0].completedAt = new Date().toISOString();
    agentLogs[0].result = {
      regionsDetected: predictorResult.damage_regions.length,
      draftCost: predictorResult.draft_cost_estimate,
    };

    onProgress('predictor_done', `Found ${predictorResult.damage_regions.length} damage region(s)`, 0);

    // Small delay for UX
    await new Promise(r => setTimeout(r, 500));

    // ─── Stage 2: Contradictor ───
    onProgress('contradictor', 'Starting adversarial review...', 1);
    agentLogs.push({ agent: 'contradictor', status: 'running', startedAt: new Date().toISOString() });

    const contradictorResult = await runContradictor(
      predictorResult,
      incidentDescription,
      vehicleInfo,
      (msg) => onProgress('contradictor', msg, 1)
    );

    agentLogs[1].status = 'completed';
    agentLogs[1].completedAt = new Date().toISOString();
    agentLogs[1].result = {
      challengesRaised: contradictorResult.challenges.length,
      fraudSignalScore: contradictorResult.fraud_signal_score,
      agreementLevel: contradictorResult.agreement_level,
    };

    onProgress('contradictor_done', `Raised ${contradictorResult.challenges.length} challenge(s)`, 1);

    await new Promise(r => setTimeout(r, 500));

    // ─── Stage 3: Arbiter ───
    onProgress('arbiter', 'Starting final arbitration...', 2);
    agentLogs.push({ agent: 'arbiter', status: 'running', startedAt: new Date().toISOString() });

    const arbiterResult = await runArbiter(
      predictorResult,
      contradictorResult,
      incidentDescription,
      vehicleInfo,
      validImages,
      (msg) => onProgress('arbiter', msg, 2)
    );

    agentLogs[2].status = 'completed';
    agentLogs[2].completedAt = new Date().toISOString();
    agentLogs[2].result = {
      recommendation: arbiterResult.recommendation,
      confidence: arbiterResult.confidence,
      totalCost: arbiterResult.estimated_cost,
    };

    onProgress('arbiter_done', `Verdict: ${arbiterResult.recommendation}`, 2);

    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(1);

    // ─── Assemble final result ───
    return {
      success: true,
      claim_id: arbiterResult.claim_id,
      processing_time_seconds: parseFloat(processingTime),

      // Final assessment
      ...arbiterResult,

      // Agent-level outputs (for audit trail)
      agent_outputs: {
        predictor: predictorResult,
        contradictor: contradictorResult,
        arbiter: arbiterResult,
      },

      // Processing metadata
      agent_logs: agentLogs,
      pipeline_version: '1.0',
    };
  } catch (error) {
    const endTime = Date.now();
    console.error('Tri-agent pipeline failed:', error);

    return {
      success: false,
      error: error.message,
      processing_time_seconds: parseFloat(((endTime - startTime) / 1000).toFixed(1)),
      agent_logs: agentLogs,
      pipeline_version: '1.0',
    };
  }
}
