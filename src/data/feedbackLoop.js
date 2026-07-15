// Continual Learning / Feedback Loop Pipeline (§8)
// Captures surveyor corrections, manages feedback datasets, tracks model accuracy drift
// Implements: correction capture → labeled delta store → retraining pipeline simulation → champion/challenger

const FEEDBACK_STORE_KEY = 'autoclaim_feedback_store';
const MODEL_VERSIONS_KEY = 'autoclaim_model_versions';
const ACCURACY_LOG_KEY = 'autoclaim_accuracy_log';
const RETRAINING_QUEUE_KEY = 'autoclaim_retraining_queue';

// ─── Feedback Store ───

/**
 * Capture a surveyor correction as a structured diff
 * Per §8: { field, model_value, corrected_value, corrector_id, timestamp, claim_id }
 */
export function captureSurveyorCorrection(correction) {
  const entry = {
    id: `FB-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    claim_id: correction.claimId,
    field: correction.field,
    model_value: correction.modelValue,
    corrected_value: correction.correctedValue,
    corrector_id: correction.correctorId || 'adjuster-default',
    timestamp: new Date().toISOString(),
    correction_type: categorizeCorrection(correction.field, correction.modelValue, correction.correctedValue),
    magnitude: computeCorrectionMagnitude(correction.field, correction.modelValue, correction.correctedValue),
    used_in_retraining: false,
    retraining_batch_id: null,
  };

  const store = getFeedbackStore();
  store.corrections.push(entry);
  store.stats.totalCorrections++;
  store.stats.lastCorrectionAt = entry.timestamp;
  saveFeedbackStore(store);

  // Check if retraining threshold is met
  checkRetrainingTrigger(store);

  return entry;
}

/**
 * Categorize the type of correction
 */
function categorizeCorrection(field, modelValue, correctedValue) {
  if (field === 'severity') return 'severity_adjustment';
  if (field === 'damage_type') return 'damage_reclassification';
  if (field === 'part') return 'part_correction';
  if (field === 'estimated_cost' || field === 'cost') return 'cost_adjustment';
  if (field === 'recommendation') return 'recommendation_override';
  if (field === 'fraud_score') return 'fraud_assessment_correction';
  return 'general_correction';
}

/**
 * Compute correction magnitude (0-1 scale)
 */
function computeCorrectionMagnitude(field, modelValue, correctedValue) {
  if (field === 'estimated_cost' || field === 'cost') {
    const mv = parseFloat(modelValue) || 0;
    const cv = parseFloat(correctedValue) || 0;
    if (mv === 0) return cv > 0 ? 1.0 : 0;
    return Math.min(1.0, Math.abs(mv - cv) / mv);
  }

  if (field === 'severity') {
    const levels = { minor: 0, moderate: 1, severe: 2, critical: 3 };
    const diff = Math.abs((levels[modelValue] || 0) - (levels[correctedValue] || 0));
    return diff / 3;
  }

  if (field === 'confidence' || field === 'fraud_score') {
    return Math.min(1.0, Math.abs((parseFloat(modelValue) || 0) - (parseFloat(correctedValue) || 0)));
  }

  // For categorical fields, any change = 1.0
  return modelValue !== correctedValue ? 1.0 : 0;
}

// ─── Feedback Store Management ───

function getFeedbackStore() {
  try {
    const data = localStorage.getItem(FEEDBACK_STORE_KEY);
    if (data) return JSON.parse(data);
  } catch {}

  return createEmptyStore();
}

function createEmptyStore() {
  return {
    version: '1.0',
    corrections: [],
    stats: {
      totalCorrections: 0,
      lastCorrectionAt: null,
      retrainingRuns: 0,
      lastRetrainingAt: null,
      averageCorrectionMagnitude: 0,
    },
    config: {
      retrainingThreshold: 3, // Number of corrections before triggering retrain (reduced for faster learning loop)
      autoRetrainEnabled: true,
      retrainingCooldownHours: 24,
    },
  };
}

function saveFeedbackStore(store) {
  localStorage.setItem(FEEDBACK_STORE_KEY, JSON.stringify(store));
}

/**
 * Get all corrections for a specific claim
 */
export function getClaimCorrections(claimId) {
  const store = getFeedbackStore();
  return store.corrections.filter(c => c.claim_id === claimId);
}

/**
 * Get all unused corrections (not yet used in retraining)
 */
export function getUnusedCorrections() {
  const store = getFeedbackStore();
  return store.corrections.filter(c => !c.used_in_retraining);
}

/**
 * Get feedback statistics
 */
export function getFeedbackStats() {
  const store = getFeedbackStore();
  const corrections = store.corrections;

  // Compute field-level stats
  const fieldStats = {};
  for (const c of corrections) {
    if (!fieldStats[c.field]) {
      fieldStats[c.field] = { count: 0, totalMagnitude: 0 };
    }
    fieldStats[c.field].count++;
    fieldStats[c.field].totalMagnitude += c.magnitude;
  }

  for (const field of Object.keys(fieldStats)) {
    fieldStats[field].avgMagnitude = fieldStats[field].totalMagnitude / fieldStats[field].count;
  }

  // Compute time-series accuracy data
  const accuracyTrend = computeAccuracyTrend(corrections);

  return {
    ...store.stats,
    fieldStats,
    accuracyTrend,
    unusedCorrections: corrections.filter(c => !c.used_in_retraining).length,
    correctionsByType: groupBy(corrections, 'correction_type'),
  };
}

// ─── Retraining Pipeline ───

/**
 * Check if retraining should be triggered
 */
function checkRetrainingTrigger(store) {
  const unused = store.corrections.filter(c => !c.used_in_retraining);

  if (unused.length >= store.config.retrainingThreshold && store.config.autoRetrainEnabled) {
    // Check cooldown
    if (store.stats.lastRetrainingAt) {
      const hoursSince = (Date.now() - new Date(store.stats.lastRetrainingAt).getTime()) / (1000 * 60 * 60);
      if (hoursSince < store.config.retrainingCooldownHours) return;
    }

    // Queue retraining
    queueRetrainingJob(unused);
  }
}

/**
 * Queue a retraining job
 */
function queueRetrainingJob(corrections) {
  const job = {
    id: `RT-${Date.now()}`,
    status: 'queued',
    createdAt: new Date().toISOString(),
    corrections: corrections.length,
    correctionIds: corrections.map(c => c.id),
  };

  const queue = JSON.parse(localStorage.getItem(RETRAINING_QUEUE_KEY) || '[]');
  queue.push(job);
  localStorage.setItem(RETRAINING_QUEUE_KEY, JSON.stringify(queue));

  return job;
}

/**
 * Simulate a retraining run (in production, this would be a backend job)
 * Implements the offline evaluation + champion/challenger pattern from §8
 */
export function simulateRetraining() {
  const store = getFeedbackStore();
  const unused = store.corrections.filter(c => !c.used_in_retraining);

  if (unused.length === 0) {
    return {
      success: false,
      message: 'No unused corrections available for retraining',
    };
  }

  const batchId = `BATCH-${Date.now()}`;
  const currentVersion = getCurrentModelVersion();

  // Mark corrections as used
  for (const correction of unused) {
    correction.used_in_retraining = true;
    correction.retraining_batch_id = batchId;
  }

  // Simulate offline evaluation with significant improvements
  const avgMagnitude = unused.reduce((sum, c) => sum + c.magnitude, 0) / unused.length;
  const improvementFactor = 1 + (avgMagnitude * 0.35) + (unused.length * 0.05); // Stronger learning based on correction volume and magnitude

  const newVersion = {
    version: `v${(parseFloat(currentVersion.version.replace('v', '')) + 0.1).toFixed(1)}`,
    trainedAt: new Date().toISOString(),
    batchId,
    correctionsUsed: unused.length,
    metrics: {
      costMAE: Math.max(500, currentVersion.metrics.costMAE / improvementFactor),
      severityAccuracy: Math.min(0.98, currentVersion.metrics.severityAccuracy * improvementFactor),
      fraudPrecision: Math.min(0.97, currentVersion.metrics.fraudPrecision + 0.005),
      fraudRecall: Math.min(0.95, currentVersion.metrics.fraudRecall + 0.003),
    },
    status: 'challenger', // Shadow-runs alongside production
    evaluation: {
      validationSetSize: 100 + unused.length * 2,
      beatsProduction: true,
      promotionReady: true,
    },
  };

  // Save new version
  saveModelVersion(newVersion);

  // Update store stats
  store.stats.retrainingRuns++;
  store.stats.lastRetrainingAt = new Date().toISOString();
  saveFeedbackStore(store);

  // Log accuracy
  logAccuracyPoint(newVersion);

  return {
    success: true,
    batchId,
    correctionsUsed: unused.length,
    previousVersion: currentVersion.version,
    newVersion: newVersion.version,
    metrics: newVersion.metrics,
    message: `Retraining complete. New model ${newVersion.version} created as challenger. Waiting for promotion.`,
  };
}

/**
 * Promote challenger model to production (champion/challenger pattern)
 */
export function promoteModel(version) {
  const versions = getModelVersions();
  for (const v of versions) {
    if (v.version === version) {
      v.status = 'production';
      v.promotedAt = new Date().toISOString();
    } else if (v.status === 'production') {
      v.status = 'retired';
      v.retiredAt = new Date().toISOString();
    }
  }
  localStorage.setItem(MODEL_VERSIONS_KEY, JSON.stringify(versions));
}

/**
 * Rollback to a previous model version
 */
export function rollbackModel(version) {
  const versions = getModelVersions();
  const target = versions.find(v => v.version === version);
  if (!target) return false;

  for (const v of versions) {
    if (v.version === version) {
      v.status = 'production';
      v.restoredAt = new Date().toISOString();
    } else if (v.status === 'production') {
      v.status = 'rolled-back';
    }
  }
  localStorage.setItem(MODEL_VERSIONS_KEY, JSON.stringify(versions));
  return true;
}

// ─── Model Version Registry ───

export function getModelVersions() {
  try {
    const data = localStorage.getItem(MODEL_VERSIONS_KEY);
    if (data) return JSON.parse(data);
  } catch {}

  // Initialize with baseline model
  const baseline = [{
    version: 'v1.0',
    trainedAt: '2026-01-01T00:00:00Z',
    batchId: 'INITIAL',
    correctionsUsed: 0,
    metrics: {
      costMAE: 5200,
      severityAccuracy: 0.82,
      fraudPrecision: 0.88,
      fraudRecall: 0.85,
    },
    status: 'production',
    evaluation: { validationSetSize: 500, beatsProduction: true, promotionReady: true },
  }];
  localStorage.setItem(MODEL_VERSIONS_KEY, JSON.stringify(baseline));
  return baseline;
}

export function getCurrentModelVersion() {
  const versions = getModelVersions();
  return versions.find(v => v.status === 'production') || versions[versions.length - 1];
}

function saveModelVersion(version) {
  const versions = getModelVersions();
  versions.push(version);
  localStorage.setItem(MODEL_VERSIONS_KEY, JSON.stringify(versions));
}

// ─── Accuracy Tracking / Drift Dashboard ───

function logAccuracyPoint(version) {
  const log = JSON.parse(localStorage.getItem(ACCURACY_LOG_KEY) || '[]');
  log.push({
    timestamp: new Date().toISOString(),
    version: version.version,
    ...version.metrics,
  });
  localStorage.setItem(ACCURACY_LOG_KEY, JSON.stringify(log));
}

export function getAccuracyLog() {
  return JSON.parse(localStorage.getItem(ACCURACY_LOG_KEY) || '[]');
}

function computeAccuracyTrend(corrections) {
  // Group corrections by week
  const weeks = {};
  for (const c of corrections) {
    const date = new Date(c.timestamp);
    const weekStart = new Date(date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weeks[weekKey]) {
      weeks[weekKey] = { count: 0, totalMagnitude: 0 };
    }
    weeks[weekKey].count++;
    weeks[weekKey].totalMagnitude += c.magnitude;
  }

  return Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, data]) => ({
      week,
      corrections: data.count,
      avgMagnitude: data.totalMagnitude / data.count,
      estimatedAccuracy: Math.max(0.7, 1 - data.totalMagnitude / data.count),
    }));
}

// ─── Export / Audit ───

/**
 * Export the full feedback dataset for audit
 */
export function exportFeedbackDataset() {
  const store = getFeedbackStore();
  return {
    exportedAt: new Date().toISOString(),
    version: store.version,
    totalCorrections: store.corrections.length,
    corrections: store.corrections,
    stats: store.stats,
    modelVersions: getModelVersions(),
    accuracyLog: getAccuracyLog(),
  };
}

/**
 * Clear feedback store (for testing)
 */
export function clearFeedbackStore() {
  localStorage.removeItem(FEEDBACK_STORE_KEY);
  localStorage.removeItem(MODEL_VERSIONS_KEY);
  localStorage.removeItem(ACCURACY_LOG_KEY);
  localStorage.removeItem(RETRAINING_QUEUE_KEY);
}

// ─── Helpers ───

function groupBy(arr, key) {
  return arr.reduce((groups, item) => {
    const val = item[key];
    if (!groups[val]) groups[val] = [];
    groups[val].push(item);
    return groups;
  }, {});
}
