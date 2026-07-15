// Standardized Repair Pricing Database — Indian market (INR)
// Versioned, traceable, region-configurable

export const PRICING_VERSION = 'v1.0-IN-2026';
export const CURRENCY = 'INR';
export const CURRENCY_SYMBOL = '₹';
export const GST_RATE = 0.18;
export const LABOR_RATE_PER_HOUR = 800; // INR per hour

// Parts pricing database — covers common vehicle segments
export const PARTS_DB = {
  front_bumper: {
    name: 'Front Bumper',
    replace: { min: 4500, max: 18000 },
    repair: { min: 1500, max: 5000 },
    repaint: { min: 3000, max: 7000 },
    laborHours: { replace: 2.5, repair: 1.5, repaint: 2 },
    partCode: 'FB-001',
  },
  rear_bumper: {
    name: 'Rear Bumper',
    replace: { min: 4000, max: 16000 },
    repair: { min: 1200, max: 4500 },
    repaint: { min: 2800, max: 6500 },
    laborHours: { replace: 2, repair: 1.5, repaint: 2 },
    partCode: 'RB-001',
  },
  hood: {
    name: 'Hood / Bonnet',
    replace: { min: 8000, max: 35000 },
    repair: { min: 3000, max: 8000 },
    repaint: { min: 4000, max: 9000 },
    laborHours: { replace: 3, repair: 2, repaint: 2.5 },
    partCode: 'HD-001',
  },
  front_fender_left: {
    name: 'Front Fender (Left)',
    replace: { min: 5000, max: 20000 },
    repair: { min: 2000, max: 6000 },
    repaint: { min: 3000, max: 7000 },
    laborHours: { replace: 3, repair: 2, repaint: 2 },
    partCode: 'FFL-001',
  },
  front_fender_right: {
    name: 'Front Fender (Right)',
    replace: { min: 5000, max: 20000 },
    repair: { min: 2000, max: 6000 },
    repaint: { min: 3000, max: 7000 },
    laborHours: { replace: 3, repair: 2, repaint: 2 },
    partCode: 'FFR-001',
  },
  rear_fender_left: {
    name: 'Rear Fender (Left)',
    replace: { min: 6000, max: 25000 },
    repair: { min: 2500, max: 7000 },
    repaint: { min: 3500, max: 7500 },
    laborHours: { replace: 4, repair: 2.5, repaint: 2 },
    partCode: 'RFL-001',
  },
  rear_fender_right: {
    name: 'Rear Fender (Right)',
    replace: { min: 6000, max: 25000 },
    repair: { min: 2500, max: 7000 },
    repaint: { min: 3500, max: 7500 },
    laborHours: { replace: 4, repair: 2.5, repaint: 2 },
    partCode: 'RFR-001',
  },
  front_door_left: {
    name: 'Front Door (Left)',
    replace: { min: 12000, max: 45000 },
    repair: { min: 4000, max: 12000 },
    repaint: { min: 4500, max: 9000 },
    laborHours: { replace: 4, repair: 3, repaint: 2.5 },
    partCode: 'FDL-001',
  },
  front_door_right: {
    name: 'Front Door (Right)',
    replace: { min: 12000, max: 45000 },
    repair: { min: 4000, max: 12000 },
    repaint: { min: 4500, max: 9000 },
    laborHours: { replace: 4, repair: 3, repaint: 2.5 },
    partCode: 'FDR-001',
  },
  rear_door_left: {
    name: 'Rear Door (Left)',
    replace: { min: 11000, max: 40000 },
    repair: { min: 3500, max: 10000 },
    repaint: { min: 4000, max: 8500 },
    laborHours: { replace: 4, repair: 3, repaint: 2.5 },
    partCode: 'RDL-001',
  },
  rear_door_right: {
    name: 'Rear Door (Right)',
    replace: { min: 11000, max: 40000 },
    repair: { min: 3500, max: 10000 },
    repaint: { min: 4000, max: 8500 },
    laborHours: { replace: 4, repair: 3, repaint: 2.5 },
    partCode: 'RDR-001',
  },
  headlight_left: {
    name: 'Headlight (Left)',
    replace: { min: 5000, max: 25000 },
    repair: { min: 1500, max: 4000 },
    repaint: null,
    laborHours: { replace: 1.5, repair: 1 },
    partCode: 'HLL-001',
  },
  headlight_right: {
    name: 'Headlight (Right)',
    replace: { min: 5000, max: 25000 },
    repair: { min: 1500, max: 4000 },
    repaint: null,
    laborHours: { replace: 1.5, repair: 1 },
    partCode: 'HLR-001',
  },
  taillight_left: {
    name: 'Taillight (Left)',
    replace: { min: 3000, max: 15000 },
    repair: { min: 1000, max: 3000 },
    repaint: null,
    laborHours: { replace: 1, repair: 0.5 },
    partCode: 'TLL-001',
  },
  taillight_right: {
    name: 'Taillight (Right)',
    replace: { min: 3000, max: 15000 },
    repair: { min: 1000, max: 3000 },
    repaint: null,
    laborHours: { replace: 1, repair: 0.5 },
    partCode: 'TLR-001',
  },
  windshield: {
    name: 'Windshield',
    replace: { min: 8000, max: 35000 },
    repair: { min: 2000, max: 5000 },
    repaint: null,
    laborHours: { replace: 3, repair: 1 },
    partCode: 'WS-001',
  },
  rear_windshield: {
    name: 'Rear Windshield',
    replace: { min: 6000, max: 25000 },
    repair: { min: 1500, max: 4000 },
    repaint: null,
    laborHours: { replace: 2.5, repair: 1 },
    partCode: 'RWS-001',
  },
  side_mirror_left: {
    name: 'Side Mirror (Left)',
    replace: { min: 2000, max: 12000 },
    repair: { min: 800, max: 3000 },
    repaint: null,
    laborHours: { replace: 0.5, repair: 0.5 },
    partCode: 'SML-001',
  },
  side_mirror_right: {
    name: 'Side Mirror (Right)',
    replace: { min: 2000, max: 12000 },
    repair: { min: 800, max: 3000 },
    repaint: null,
    laborHours: { replace: 0.5, repair: 0.5 },
    partCode: 'SMR-001',
  },
  roof: {
    name: 'Roof Panel',
    replace: { min: 15000, max: 60000 },
    repair: { min: 5000, max: 15000 },
    repaint: { min: 5000, max: 12000 },
    laborHours: { replace: 6, repair: 4, repaint: 3 },
    partCode: 'RF-001',
  },
  trunk: {
    name: 'Trunk / Dicky',
    replace: { min: 8000, max: 30000 },
    repair: { min: 3000, max: 8000 },
    repaint: { min: 3500, max: 8000 },
    laborHours: { replace: 3, repair: 2, repaint: 2 },
    partCode: 'TR-001',
  },
  grille: {
    name: 'Front Grille',
    replace: { min: 2000, max: 15000 },
    repair: { min: 800, max: 3000 },
    repaint: null,
    laborHours: { replace: 1, repair: 0.5 },
    partCode: 'GR-001',
  },
  fog_lamp_left: {
    name: 'Fog Lamp (Left)',
    replace: { min: 2000, max: 8000 },
    repair: { min: 500, max: 2000 },
    repaint: null,
    laborHours: { replace: 1, repair: 0.5 },
    partCode: 'FLL-001',
  },
  fog_lamp_right: {
    name: 'Fog Lamp (Right)',
    replace: { min: 2000, max: 8000 },
    repair: { min: 500, max: 2000 },
    repaint: null,
    laborHours: { replace: 1, repair: 0.5 },
    partCode: 'FLR-001',
  },
  wheel_alloy: {
    name: 'Alloy Wheel',
    replace: { min: 4000, max: 20000 },
    repair: { min: 1500, max: 5000 },
    repaint: null,
    laborHours: { replace: 1, repair: 1 },
    partCode: 'WA-001',
  },
  tire: {
    name: 'Tire',
    replace: { min: 3000, max: 15000 },
    repair: { min: 500, max: 2000 },
    repaint: null,
    laborHours: { replace: 0.5, repair: 0.5 },
    partCode: 'TR-001',
  },
};

// Vehicle segment multipliers
export const SEGMENT_MULTIPLIERS = {
  hatchback: 1.0,
  sedan: 1.15,
  suv: 1.35,
  luxury_sedan: 2.0,
  luxury_suv: 2.5,
  sports: 2.2,
  commercial: 1.1,
};

// Severity-based action mapping
const SEVERITY_ACTION = {
  minor: 'repair',
  moderate: 'repair', // may need repaint
  severe: 'replace',
  critical: 'replace',
};

// Damage type to additional needs
const DAMAGE_NEEDS_REPAINT = {
  scratch: true,
  dent: true,
  crack: false,
  shatter: false,
  structural_deformation: false,
};

/**
 * Estimate repair cost for a single damage region
 * Returns line-item breakdown with source traceability
 */
export function estimateCost(part, damageType, severity, vehicleSegment = 'sedan', dentDepth = null, impactAngle = null) {
  const partData = PARTS_DB[part];
  if (!partData) {
    return {
      lineItems: [{ item: `Unknown part: ${part}`, cost: 0, source: 'N/A' }],
      subtotal: 0,
      gst: 0,
      total: 0,
    };
  }

  const multiplier = SEGMENT_MULTIPLIERS[vehicleSegment] || 1.15;
  
  // Use dent depth and impact angle for better action estimation
  let action = SEVERITY_ACTION[severity] || 'repair';
  if (damageType === 'dent' && dentDepth) {
    // Basic heuristic: if depth > 5cm or 50mm, force replace
    if (dentDepth.includes('cm') && parseFloat(dentDepth) > 5) action = 'replace';
    if (dentDepth.includes('mm') && parseFloat(dentDepth) > 50) action = 'replace';
  }
  if (impactAngle && impactAngle.toLowerCase().includes('head on') && action === 'repair') {
    action = 'replace'; // Head on collisions usually require part replacement
  }

  const needsRepaint = DAMAGE_NEEDS_REPAINT[damageType] && partData.repaint;

  const lineItems = [];
  let subtotal = 0;

  // Part cost (repair or replacement)
  const partCostRange = partData[action];
  if (partCostRange) {
    const severityFactor = severity === 'minor' ? 0.3 : severity === 'moderate' ? 0.6 : severity === 'severe' ? 0.85 : 1.0;
    const baseCost = Math.round((partCostRange.min + (partCostRange.max - partCostRange.min) * severityFactor) * multiplier);
    lineItems.push({
      item: `${partData.name} ${action === 'replace' ? 'Replacement' : 'Repair'}`,
      cost: baseCost,
      source: `${partData.partCode}/${action}/${PRICING_VERSION}`,
    });
    subtotal += baseCost;
  }

  // Repaint cost (if applicable)
  if (needsRepaint) {
    const paintCost = Math.round(
      ((partData.repaint.min + partData.repaint.max) / 2) * multiplier * 0.7
    );
    lineItems.push({
      item: `${partData.name} Repaint`,
      cost: paintCost,
      source: `${partData.partCode}/repaint/${PRICING_VERSION}`,
    });
    subtotal += paintCost;
  }

  // Paint materials
  if (needsRepaint || action === 'replace') {
    const paintMaterials = Math.round(2500 * multiplier);
    lineItems.push({
      item: 'Paint Materials',
      cost: paintMaterials,
      source: `PAINT-MAT/${PRICING_VERSION}`,
    });
    subtotal += paintMaterials;
  }

  // Labor
  const laborHours = partData.laborHours?.[action] || 2;
  const laborCost = Math.round(laborHours * LABOR_RATE_PER_HOUR * multiplier);
  lineItems.push({
    item: `Labor (${laborHours} hrs @ ${CURRENCY_SYMBOL}${LABOR_RATE_PER_HOUR}/hr)`,
    cost: laborCost,
    source: `LABOR/${LABOR_RATE_PER_HOUR}hr/${PRICING_VERSION}`,
  });
  subtotal += laborCost;

  // GST
  const gst = Math.round(subtotal * GST_RATE);
  lineItems.push({
    item: `GST (${GST_RATE * 100}%)`,
    cost: gst,
    source: `GST/${GST_RATE}/${PRICING_VERSION}`,
  });

  return {
    lineItems,
    subtotal,
    gst,
    total: subtotal + gst,
  };
}

/**
 * Estimate cost for multiple damage regions
 */
export function estimateTotalCost(damageRegions, vehicleSegment = 'sedan') {
  const allLineItems = [];
  let totalSubtotal = 0;

  for (const region of damageRegions) {
    const estimate = estimateCost(region.part, region.damage_type, region.severity, vehicleSegment, region.dent_depth, region.impact_angle);
    // Add part-specific items (excluding GST which we'll calculate at the end)
    for (const item of estimate.lineItems) {
      if (!item.item.startsWith('GST')) {
        allLineItems.push(item);
        totalSubtotal += item.cost;
      }
    }
  }

  const totalGst = Math.round(totalSubtotal * GST_RATE);
  allLineItems.push({
    item: `GST (${GST_RATE * 100}%)`,
    cost: totalGst,
    source: `GST/${GST_RATE}/${PRICING_VERSION}`,
  });

  return {
    lineItems: allLineItems,
    subtotal: totalSubtotal,
    gst: totalGst,
    total: totalSubtotal + totalGst,
    currency: CURRENCY,
    currencySymbol: CURRENCY_SYMBOL,
    pricingVersion: PRICING_VERSION,
  };
}
