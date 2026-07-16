// Fraud & Anomaly Detection Service
// Composite fraud scoring from multiple signals per §7

/**
 * Compute composite fraud score from multiple detection signals
 * Returns 0-100 score with contributing factors listed
 */
export function computeFraudScore({
  physicsValidation = null,
  agentDisagreement = null,
  metadataAnalysis = null,
  claimHistory = null,
  imageAnalysis = null,
}) {
  const signals = [];
  let weightedSum = 0;
  let totalWeight = 0;

  // Signal 1: Physics inconsistency (from Contradictor / Physics Engine)
  if (physicsValidation) {
    const physicsScore = physicsValidation.verdict === 'inconsistent'
      ? 80 + (100 - physicsValidation.score) * 0.2
      : physicsValidation.verdict === 'indeterminate'
        ? 30 + (100 - physicsValidation.score) * 0.3
        : Math.max(0, 10 - physicsValidation.score * 0.1);

    signals.push({
      type: 'Physics Consistency',
      score: Math.round(physicsScore),
      weight: 0.30,
      detail: physicsValidation.summary,
      icon: '⚡',
    });
    weightedSum += physicsScore * 0.30;
    totalWeight += 0.30;
  }

  // Signal 2: Agent disagreement magnitude
  if (agentDisagreement !== null) {
    const disagreeScore = agentDisagreement * 100; // 0-1 scale to 0-100
    signals.push({
      type: 'Agent Disagreement',
      score: Math.round(disagreeScore),
      weight: 0.20,
      detail: disagreeScore > 50
        ? `High disagreement between Predictor and Contradictor agents (${Math.round(disagreeScore)}%)`
        : `Low agent disagreement — consistent analysis (${Math.round(disagreeScore)}%)`,
      icon: '🤖',
    });
    weightedSum += disagreeScore * 0.20;
    totalWeight += 0.20;
  }

  // Signal 3: Metadata/EXIF anomalies
  if (metadataAnalysis) {
    const metaScore = metadataAnalysis.anomalyScore || 0;
    signals.push({
      type: 'Metadata Forensics',
      score: Math.round(metaScore),
      weight: 0.15,
      detail: metadataAnalysis.detail || 'No metadata anomalies detected',
      icon: '🔍',
    });
    weightedSum += metaScore * 0.15;
    totalWeight += 0.15;
  }

  // Signal 4: Claim history patterns
  if (claimHistory) {
    const historyScore = claimHistory.anomalyScore || 0;
    signals.push({
      type: 'Claim History',
      score: Math.round(historyScore),
      weight: 0.15,
      detail: claimHistory.detail || 'No suspicious claim patterns detected',
      icon: '📋',
    });
    weightedSum += historyScore * 0.15;
    totalWeight += 0.15;
  }

  // Signal 5: Image analysis (duplicate detection, anomalies)
  if (imageAnalysis) {
    const imgScore = imageAnalysis.anomalyScore || 0;
    signals.push({
      type: 'Image Analysis',
      score: Math.round(imgScore),
      weight: 0.20,
      detail: imageAnalysis.detail || 'No image anomalies detected',
      icon: '🖼️',
    });
    weightedSum += imgScore * 0.20;
    totalWeight += 0.20;
  }

  // Normalize if not all signals present
  const compositeScore = totalWeight > 0
    ? Math.round(weightedSum / totalWeight)
    : 0;

  // Determine fraud risk level
  let riskLevel, recommendation;
  if (compositeScore >= 70) {
    riskLevel = 'high';
    recommendation = 'Route to SIU — never auto-approve';
  } else if (compositeScore >= 40) {
    riskLevel = 'medium';
    recommendation = 'Flag for human review';
  } else {
    riskLevel = 'low';
    recommendation = 'No fraud indicators — proceed normally';
  }

  return {
    score: compositeScore,
    riskLevel,
    recommendation,
    signals,
    totalSignals: signals.length,
  };
}

/**
 * Analyze image metadata for forensic anomalies
 * (Simplified — real implementation would check EXIF data)
 */
export function analyzeImageMetadata(files, incidentDate, _incidentLocation) {
  const anomalies = [];
  let anomalyScore = 0;

  for (const file of files) {
    // Check for screenshots (common fraud pattern)
    if (file.name && (file.name.includes('screenshot') || file.name.includes('Screen'))) {
      anomalies.push('Image appears to be a screenshot — possible image reuse');
      anomalyScore += 30;
    }

    // Check file size (very small files may be recompressed/downloaded)
    if (file.size < 50000) { // < 50KB
      anomalies.push(`Image "${file.name}" is unusually small (${Math.round(file.size / 1024)}KB) — may be downloaded/recompressed`);
      anomalyScore += 15;
    }

    // Check file type
    if (file.type && !['image/jpeg', 'image/png', 'image/heic', 'image/heif'].includes(file.type)) {
      anomalies.push(`Unusual image format: ${file.type}`);
      anomalyScore += 10;
    }

    // Check modification date vs incident date
    if (file.lastModified && incidentDate) {
      const fileDate = new Date(file.lastModified);
      const claimedDate = new Date(incidentDate);
      const daysDiff = Math.abs((fileDate - claimedDate) / (1000 * 60 * 60 * 24));

      if (daysDiff > 30) {
        anomalies.push(`Image last modified ${Math.round(daysDiff)} days ${fileDate < claimedDate ? 'before' : 'after'} claimed incident date`);
        anomalyScore += 25;
      }
    }
  }

  anomalyScore = Math.min(100, anomalyScore);

  return {
    anomalyScore,
    anomalies,
    detail: anomalies.length > 0
      ? `${anomalies.length} metadata anomalies found: ${anomalies[0]}`
      : 'No metadata anomalies detected — images appear authentic',
  };
}

/**
 * Analyze claim history for patterns (simplified demo — uses localStorage)
 */
export function analyzeClaimHistory(customerPhone, customerEmail) {
  try {
    const claims = JSON.parse(localStorage.getItem('autoclaim_claims') || '[]');
    const customerClaims = claims.filter(c =>
      c.vehicle?.phone === customerPhone || c.vehicle?.email === customerEmail
    );

    const recentClaims = customerClaims.filter(c => {
      const claimDate = new Date(c.submittedAt);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return claimDate > sixMonthsAgo;
    });

    let anomalyScore = 0;
    const patterns = [];

    if (recentClaims.length >= 3) {
      anomalyScore += 40;
      patterns.push(`${recentClaims.length} claims in past 6 months — unusually high frequency`);
    } else if (recentClaims.length >= 2) {
      anomalyScore += 15;
      patterns.push(`${recentClaims.length} claims in past 6 months`);
    }

    if (customerClaims.length >= 5) {
      anomalyScore += 20;
      patterns.push(`${customerClaims.length} total historical claims`);
    }

    return {
      anomalyScore: Math.min(100, anomalyScore),
      patterns,
      totalClaims: customerClaims.length,
      recentClaims: recentClaims.length,
      detail: patterns.length > 0
        ? patterns.join('; ')
        : 'No unusual claim patterns detected',
    };
  } catch {
    return { anomalyScore: 0, patterns: [], totalClaims: 0, recentClaims: 0, detail: 'No claim history available' };
  }
}
