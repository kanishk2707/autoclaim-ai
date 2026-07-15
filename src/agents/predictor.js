// Agent 1 — Predictor
// Damage detection, classification, severity scoring, draft cost estimate
import { aiVision, parseJsonResponse } from '../api/apiRouter';
import { estimateTotalCost, PARTS_DB } from '../data/pricingEngine';

const PREDICTOR_PROMPT = `You are Agent 1 (Predictor) in the AutoClaim AI tri-agent system for vehicle insurance damage assessment. 

Analyze the vehicle damage image(s) provided and return a STRICT JSON response with no extra text.

Your task:
1. Detect all damaged regions visible in the image(s)
2. For each region, identify: the specific vehicle part, damage type, and severity
3. Assess confidence for each detection

VALID PARTS (use these exact keys):
front_bumper, rear_bumper, hood, front_fender_left, front_fender_right, rear_fender_left, rear_fender_right, front_door_left, front_door_right, rear_door_left, rear_door_right, headlight_left, headlight_right, taillight_left, taillight_right, windshield, rear_windshield, side_mirror_left, side_mirror_right, roof, trunk, grille, fog_lamp_left, fog_lamp_right, wheel_alloy, tire

VALID DAMAGE TYPES: scratch, dent, crack, shatter, structural_deformation

VALID SEVERITY: minor, moderate, severe, critical

Return ONLY this JSON (no markdown, no explanation):
{
  "damage_regions": [
    {
      "part": "<part_key>",
      "damage_type": "<type>",
      "severity": "<severity>",
      "confidence": <0.0-1.0>,
      "description": "<brief description of what you see>",
      "dent_depth": "<estimated depth e.g. '5mm', '2cm', or null>",
      "impact_angle": "<estimated impact angle e.g. '90 degrees', 'glancing', or null>",
      "bbox": [x, y, width, height] // percentages (0-100) for bounding box
    }
  ],
  "vehicle_overview": "<brief description of the vehicle and overall damage state>",
  "damage_summary": "<one sentence summary of all damage>"
}

Be precise. Only report damage you can actually see. Do not hallucinate or invent damage.`;

export async function runPredictor(images, vehicleInfo = {}, onProgress = null) {
  if (onProgress) onProgress('Analyzing damage images with vision AI...');

  const response = await aiVision(images, PREDICTOR_PROMPT, {
    temperature: 0.15,
    maxTokens: 4096,
  });

  if (onProgress) onProgress('Parsing damage detection results...');

  let parsed;
  try {
    parsed = parseJsonResponse(response);
  } catch (e) {
    console.error('Failed to parse Predictor response:', response);
    throw new Error(`Predictor failed to produce valid results: ${e.message}`);
  }

  // Validate and clean the damage regions
  const validParts = Object.keys(PARTS_DB);
  const validTypes = ['scratch', 'dent', 'crack', 'shatter', 'structural_deformation'];
  const validSeverities = ['minor', 'moderate', 'severe', 'critical'];

  const cleanedRegions = (parsed.damage_regions || [])
    .filter(r => r.part && r.damage_type && r.severity)
    .map((r, i) => ({
      id: `r${i + 1}`,
      part: validParts.includes(r.part) ? r.part : findClosestPart(r.part, validParts),
      damage_type: validTypes.includes(r.damage_type) ? r.damage_type : 'scratch',
      severity: validSeverities.includes(r.severity) ? r.severity : 'moderate',
      confidence: Math.min(1, Math.max(0, parseFloat(r.confidence) || 0.5)),
      description: r.description || '',
      dent_depth: r.dent_depth || null,
      impact_angle: r.impact_angle || null,
      bbox: Array.isArray(r.bbox) && r.bbox.length === 4 ? r.bbox : [10, 10, 80, 80],
    }));

  if (onProgress) onProgress('Computing cost estimate from pricing database...');

  // Generate cost estimate
  const vehicleSegment = vehicleInfo.segment || 'sedan';
  const costEstimate = estimateTotalCost(cleanedRegions, vehicleSegment);

  return {
    agent: 'predictor',
    damage_regions: cleanedRegions,
    draft_cost_estimate: costEstimate.total,
    cost_breakdown: costEstimate,
    vehicle_overview: parsed.vehicle_overview || '',
    damage_summary: parsed.damage_summary || '',
    currency: 'INR',
    timestamp: new Date().toISOString(),
  };
}

function findClosestPart(input, validParts) {
  const normalized = input.toLowerCase().replace(/[^a-z_]/g, '_');
  // Try direct match
  if (validParts.includes(normalized)) return normalized;
  // Try partial match
  const match = validParts.find(p => normalized.includes(p) || p.includes(normalized));
  return match || 'front_bumper'; // fallback
}
