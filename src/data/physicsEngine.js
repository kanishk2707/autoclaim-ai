// Physics-Based Damage Validation Engine
// Rule-based/parametric model for collision consistency checking
// Calibrated against crash-test data patterns

// Part position mapping on vehicle body
const PART_POSITIONS = {
  front_bumper: { zone: 'front', height: 'low' },
  rear_bumper: { zone: 'rear', height: 'low' },
  hood: { zone: 'front', height: 'mid' },
  front_fender_left: { zone: 'front-left', height: 'mid' },
  front_fender_right: { zone: 'front-right', height: 'mid' },
  rear_fender_left: { zone: 'rear-left', height: 'mid' },
  rear_fender_right: { zone: 'rear-right', height: 'mid' },
  front_door_left: { zone: 'left', height: 'mid' },
  front_door_right: { zone: 'right', height: 'mid' },
  rear_door_left: { zone: 'left', height: 'mid' },
  rear_door_right: { zone: 'right', height: 'mid' },
  headlight_left: { zone: 'front-left', height: 'mid' },
  headlight_right: { zone: 'front-right', height: 'mid' },
  taillight_left: { zone: 'rear-left', height: 'mid' },
  taillight_right: { zone: 'rear-right', height: 'mid' },
  windshield: { zone: 'front', height: 'high' },
  rear_windshield: { zone: 'rear', height: 'high' },
  side_mirror_left: { zone: 'left', height: 'high' },
  side_mirror_right: { zone: 'right', height: 'high' },
  roof: { zone: 'top', height: 'high' },
  trunk: { zone: 'rear', height: 'mid' },
  grille: { zone: 'front', height: 'mid' },
  fog_lamp_left: { zone: 'front-left', height: 'low' },
  fog_lamp_right: { zone: 'front-right', height: 'low' },
  wheel_alloy: { zone: 'side', height: 'low' },
  tire: { zone: 'side', height: 'low' },
};

// Severity to estimated impact speed range (km/h)
const SEVERITY_SPEED_MAP = {
  minor: { min: 0, max: 15, label: '0–15 km/h' },
  moderate: { min: 10, max: 35, label: '10–35 km/h' },
  severe: { min: 25, max: 60, label: '25–60 km/h' },
  critical: { min: 40, max: 100, label: '40–100+ km/h' },
};



// Incident type to expected damage patterns
const INCIDENT_PATTERNS = {
  parking_scratch: {
    expectedSeverity: ['minor'],
    expectedDamageTypes: ['scratch', 'dent'],
    expectedZones: ['side', 'front', 'rear', 'front-left', 'front-right', 'rear-left', 'rear-right', 'left', 'right'],
    maxParts: 2,
    maxSpeedKmh: 10,
    label: 'Parking lot scratch/bump',
  },
  low_speed_collision: {
    expectedSeverity: ['minor', 'moderate'],
    expectedDamageTypes: ['scratch', 'dent', 'crack'],
    expectedZones: ['front', 'rear', 'front-left', 'front-right', 'rear-left', 'rear-right'],
    maxParts: 3,
    maxSpeedKmh: 30,
    label: 'Low-speed collision',
  },
  rear_end: {
    expectedSeverity: ['minor', 'moderate', 'severe'],
    expectedDamageTypes: ['dent', 'crack', 'shatter'],
    expectedZones: ['rear', 'rear-left', 'rear-right'],
    maxParts: 4,
    maxSpeedKmh: 50,
    label: 'Rear-end collision',
  },
  side_impact: {
    expectedSeverity: ['moderate', 'severe', 'critical'],
    expectedDamageTypes: ['dent', 'crack', 'structural_deformation'],
    expectedZones: ['left', 'right', 'front-left', 'front-right', 'rear-left', 'rear-right'],
    maxParts: 5,
    maxSpeedKmh: 70,
    label: 'Side impact',
  },
  head_on: {
    expectedSeverity: ['severe', 'critical'],
    expectedDamageTypes: ['crack', 'shatter', 'structural_deformation'],
    expectedZones: ['front', 'front-left', 'front-right'],
    maxParts: 6,
    maxSpeedKmh: 100,
    label: 'Head-on / frontal collision',
  },
  rollover: {
    expectedSeverity: ['severe', 'critical'],
    expectedDamageTypes: ['structural_deformation', 'shatter', 'crack'],
    expectedZones: ['top', 'front', 'rear', 'left', 'right'],
    maxParts: 8,
    maxSpeedKmh: 100,
    label: 'Rollover',
  },
  hit_and_run: {
    expectedSeverity: ['minor', 'moderate', 'severe'],
    expectedDamageTypes: ['scratch', 'dent', 'crack'],
    expectedZones: ['front', 'rear', 'left', 'right', 'front-left', 'front-right', 'rear-left', 'rear-right'],
    maxParts: 4,
    maxSpeedKmh: 60,
    label: 'Hit-and-run',
  },
  vandalism: {
    expectedSeverity: ['minor', 'moderate'],
    expectedDamageTypes: ['scratch', 'dent', 'shatter'],
    expectedZones: ['front', 'rear', 'left', 'right', 'top', 'front-left', 'front-right', 'rear-left', 'rear-right', 'side'],
    maxParts: 5,
    maxSpeedKmh: 0,
    label: 'Vandalism / deliberate damage',
  },
  natural_disaster: {
    expectedSeverity: ['minor', 'moderate', 'severe', 'critical'],
    expectedDamageTypes: ['dent', 'crack', 'shatter', 'structural_deformation'],
    expectedZones: ['top', 'front', 'rear', 'left', 'right', 'front-left', 'front-right', 'rear-left', 'rear-right'],
    maxParts: 10,
    maxSpeedKmh: 0,
    label: 'Natural disaster / weather',
  },
};

/**
 * Classify incident type from description text
 */
export function classifyIncident(description) {
  const desc = description.toLowerCase();

  // Helper: match whole-word boundaries to avoid substring collisions
  const has = (words) => {
    for (const w of words) {
      // Multi-word phrases: simple includes is fine
      if (w.includes(' ') || w.includes('-')) {
        if (desc.includes(w)) return true;
      } else {
        // Single words: require word boundary to avoid e.g. "park" matching "parking"
        if (new RegExp(`\\b${w}\\b`).test(desc)) return true;
      }
    }
    return false;
  };

  // Order matters: check more specific patterns first
  if (has(['rollover', 'rolled over', 'flipped', 'overturned']))
    return 'rollover';
  if (has(['head-on', 'head on', 'frontal collision']))
    return 'head_on';
  if (has(['hit-and-run', 'hit and run', 'fled the scene']))
    return 'hit_and_run';
  if (has(['rear-end', 'rear end', 'hit from behind', 'rammed from behind']))
    return 'rear_end';
  if (has(['t-bone', 'side impact', 'lateral collision', 'side collision']))
    return 'side_impact';
  if (has(['vandalism', 'vandal', 'keyed', 'deliberate', 'intentional']))
    return 'vandalism';
  if (has(['flood', 'storm', 'hail', 'fallen tree', 'natural disaster']))
    return 'natural_disaster';
  if (has(['parking lot', 'parking scratch', 'parked', 'garage bump']))
    return 'parking_scratch';
  if (has(['low speed', 'slow', 'minor collision', 'fender bender']))
    return 'low_speed_collision';

  return 'low_speed_collision'; // default
}

/**
 * Validate damage against claimed incident using physics rules
 *
 * @param {Array} damageRegions - Array of detected damage regions
 * @param {string} incidentDescription - Customer's description of the incident
 * @param {string} incidentType - Optional explicit incident type
 * @returns {Object} Validation result with consistency verdict
 */
export function validateCollisionPhysics(damageRegions, incidentDescription, incidentType = null) {
  const type = incidentType || classifyIncident(incidentDescription);
  const pattern = INCIDENT_PATTERNS[type] || INCIDENT_PATTERNS.low_speed_collision;

  const inconsistencies = [];
  const consistencies = [];
  let overallScore = 100; // Start at 100, deduct for inconsistencies

  // Check 1: Severity vs. incident type
  for (const region of damageRegions) {
    const speedRange = SEVERITY_SPEED_MAP[region.severity];
    if (speedRange && speedRange.min > pattern.maxSpeedKmh) {
      inconsistencies.push({
        type: 'severity_mismatch',
        detail: `${region.part} shows "${region.severity}" damage (implies ${speedRange.label} impact), but "${pattern.label}" typically involves ≤${pattern.maxSpeedKmh} km/h`,
        severity: 'high',
      });
      overallScore -= 25;
    } else if (pattern.expectedSeverity.includes(region.severity)) {
      consistencies.push(`${region.part} severity "${region.severity}" is consistent with ${pattern.label}`);
    }
  }

  // Check 2: Damage type consistency
  for (const region of damageRegions) {
    if (!pattern.expectedDamageTypes.includes(region.damage_type)) {
      inconsistencies.push({
        type: 'damage_type_mismatch',
        detail: `"${region.damage_type}" on ${region.part} is unusual for "${pattern.label}" incidents`,
        severity: 'medium',
      });
      overallScore -= 15;
    }
  }

  // Check 3: Zone consistency (are damaged parts in expected zones?)
  for (const region of damageRegions) {
    const partPos = PART_POSITIONS[region.part];
    if (partPos && !pattern.expectedZones.includes(partPos.zone)) {
      inconsistencies.push({
        type: 'zone_mismatch',
        detail: `Damage to ${region.part} (${partPos.zone} zone) is inconsistent with "${pattern.label}" which typically affects ${pattern.expectedZones.join(', ')} zones`,
        severity: 'high',
      });
      overallScore -= 20;
    }
  }

  // Check 4: Number of parts damaged vs. expectation
  if (damageRegions.length > pattern.maxParts) {
    inconsistencies.push({
      type: 'extent_mismatch',
      detail: `${damageRegions.length} parts damaged exceeds typical count (≤${pattern.maxParts}) for "${pattern.label}"`,
      severity: 'medium',
    });
    overallScore -= 10;
  }

  // Check 5: Structural deformation without high-speed impact
  const hasStructural = damageRegions.some(r => r.damage_type === 'structural_deformation');
  if (hasStructural && pattern.maxSpeedKmh < 25) {
    inconsistencies.push({
      type: 'physics_inconsistency',
      detail: `Structural deformation detected but "${pattern.label}" typically doesn't generate enough force for metal deformation`,
      severity: 'high',
    });
    overallScore -= 30;
  }

  overallScore = Math.max(0, Math.min(100, overallScore));

  // Determine impact direction from damaged parts
  const zones = damageRegions
    .map(r => PART_POSITIONS[r.part]?.zone)
    .filter(Boolean);
  const primaryZone = zones.length > 0 ? mode(zones) : 'unknown';

  // Estimate speed range from highest severity
  const severities = damageRegions.map(r => r.severity);
  const maxSeverity = ['critical', 'severe', 'moderate', 'minor'].find(s => severities.includes(s)) || 'minor';
  const estimatedSpeed = SEVERITY_SPEED_MAP[maxSeverity];

  let verdict;
  if (overallScore >= 75) verdict = 'consistent';
  else if (overallScore >= 45) verdict = 'indeterminate';
  else verdict = 'inconsistent';

  return {
    verdict,
    score: overallScore,
    incidentType: type,
    incidentLabel: pattern.label,
    estimatedSpeedRange: estimatedSpeed.label,
    estimatedDirection: primaryZone,
    inconsistencies,
    consistencies,
    summary: verdict === 'consistent'
      ? `Damage pattern is consistent with reported ${pattern.label}. Estimated impact: ${estimatedSpeed.label} from ${primaryZone}.`
      : verdict === 'indeterminate'
        ? `Damage pattern shows some inconsistencies with reported ${pattern.label}. Manual review recommended.`
        : `Damage pattern is INCONSISTENT with reported ${pattern.label}. ${inconsistencies.length} issues detected. Investigation recommended.`,
  };
}

function mode(arr) {
  const counts = {};
  arr.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
}
