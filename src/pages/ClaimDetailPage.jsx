import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, CheckCircle, Clock, ShieldAlert, ChevronDown, ChevronUp, Edit3, Save, X, Eye, Shield, Brain, FileText } from 'lucide-react';
import { useClaims } from '../context/ClaimContext';
import { captureSurveyorCorrection } from '../data/feedbackLoop';
import { PARTS_DB, CURRENCY_SYMBOL, estimateTotalCost } from '../data/pricingEngine';
import './ClaimDetailPage.css';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
}

function ScoreGauge({ value, max = 100, label, color = 'accent', size = 80 }) {
  const percentage = Math.min(100, (value / max) * 100);
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const colorMap = {
    accent: 'var(--color-accent)',
    emerald: 'var(--color-emerald)',
    amber: 'var(--color-amber)',
    ruby: 'var(--color-ruby)',
  };

  const strokeColor = percentage > 70 && color === 'ruby' ? colorMap.ruby
    : percentage > 40 && color === 'ruby' ? colorMap.amber
    : percentage <= 40 && color === 'ruby' ? colorMap.emerald
    : colorMap[color];

  return (
    <div className="score-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth="5" />
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="score-gauge-value">{typeof value === 'number' ? Math.round(value) : value}</div>
      {label && <div className="score-gauge-label">{label}</div>}
    </div>
  );
}

export default function ClaimDetailPage() {
  const { id } = useParams();
  const { state, dispatch } = useClaims();
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const claim = state.claims.find(c => c.id === id);
  if (!claim) {
    return (
      <div className="page"><div className="container"><div className="empty-state"><h4>Claim not found</h4><Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link></div></div></div>
    );
  }

  const results = claim.results;
  if (!results) {
    return (
      <div className="page"><div className="container"><div className="empty-state"><Clock size={48} /><h4>Claim is being processed</h4><p>Results will appear here when analysis is complete.</p><Link to="/dashboard" className="btn btn-outline">Back to Dashboard</Link></div></div></div>
    );
  }

  const regions = results.final_damage_regions || results.agent_outputs?.predictor?.damage_regions || [];
  
  // Apply overrides to regions for dynamic cost recalculation
  const effectiveRegions = regions.map((r, i) => {
    const overrideType = claim.overrides?.[`type_${i}`];
    return overrideType ? { ...r, damage_type: overrideType } : r;
  });

  const hasOverrides = Object.keys(claim.overrides || {}).some(k => k.startsWith('type_'));
  const costBreakdown = hasOverrides 
    ? estimateTotalCost(effectiveRegions, claim.vehicle?.segment || 'sedan') 
    : (results.cost_breakdown || results.agent_outputs?.predictor?.cost_breakdown);
  const fraudAnalysis = results.fraud_analysis;
  const riskScores = results.risk_scores || {};
  const agentOutputs = results.agent_outputs || {};
  const disagreementLog = results.agent_disagreement_log || {};

  const statusConfig = {
    auto_approve: { label: 'Auto-Approved', class: 'recommendation-approve', icon: <CheckCircle size={20} /> },
    needs_review: { label: 'Needs Human Review', class: 'recommendation-review', icon: <Clock size={20} /> },
    escalate_siu: { label: 'Escalated to SIU', class: 'recommendation-siu', icon: <ShieldAlert size={20} /> },
  };
  const recConfig = statusConfig[results.recommendation] || statusConfig.needs_review;

  const validOptions = ['scratch', 'dent', 'crack', 'shatter', 'structural_deformation'];
  const startEdit = (field, currentValue) => {
    setEditingField(field);
    setEditValue(validOptions.includes(currentValue) ? String(currentValue) : validOptions[0]);
  };

  const saveEdit = (field, modelValue) => {
    captureSurveyorCorrection({
      claimId: claim.id,
      field,
      modelValue: String(modelValue),
      correctedValue: editValue,
      correctorId: 'adjuster-1',
    });
    dispatch({ type: 'UPDATE_OVERRIDE', payload: { claimId: claim.id, field, value: editValue } });
    setEditingField(null);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const imagePreviewsRaw = results.imagePreviews || claim.imagePreviews || [];
  const imagePreviews = imagePreviewsRaw.map(p => typeof p === 'string' ? p : p.url).filter(p => p !== '[base64-stripped]' && Boolean(p));
  const safeImageIndex = Math.min(activeImageIndex, Math.max(0, imagePreviews.length - 1));

  return (
    <div className="page claim-detail-page">
      <div className="container">
        {/* Header */}
        <div className="detail-header">
          <Link to="/dashboard" className="btn btn-glass btn-sm"><ArrowLeft size={14} /> Dashboard</Link>
          <div className="detail-header-info">
            <h1 className="page-title">{results.claim_id || claim.id}</h1>
            <p className="page-subtitle">
              {claim.vehicle?.make} {claim.vehicle?.model}
              {results.processing_time_seconds && ` · Processed in ${results.processing_time_seconds}s`}
            </p>
          </div>
          <div className="detail-header-actions">
            {claim.status !== 'approved' && claim.status !== 'rejected' && (
              <>
                <button className="btn btn-success btn-sm" onClick={() => dispatch({ type: 'APPROVE_CLAIM', payload: claim.id })}>
                  <CheckCircle size={14} /> Approve
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => dispatch({ type: 'REJECT_CLAIM', payload: claim.id })}>
                  <X size={14} /> Reject
                </button>
              </>
            )}
          </div>
        </div>

        {/* §9.7 — Recommendation Banner */}
        <div className={`recommendation-banner ${recConfig.class}`}>
          {recConfig.icon}
          <div>
            <h4>Recommendation: {recConfig.label}</h4>
            <p>{results.arbitration_summary || results.reason?.[0] || 'Assessment complete'}</p>
          </div>
          <div className="recommendation-confidence">
            <ScoreGauge value={(results.confidence || 0) * 100} label="Confidence" color="accent" size={72} />
          </div>
        </div>

        <div className="detail-grid">
          {/* Left Column */}
          <div className="detail-left">
            {/* §9.1 — Image with highlighted overlay */}
            <div className="detail-section glass-strong">
              <h3><Eye size={18} /> Damage Images</h3>
              {imagePreviews.length > 0 ? (
                <>
                  <div className="damage-image-main">
                    <img src={imagePreviews[safeImageIndex]} alt="Vehicle damage" />
                  </div>
                  {imagePreviews.length > 1 && (
                    <div className="damage-thumbnails">
                      {imagePreviews.map((img, i) => (
                        <button key={i} className={`damage-thumb ${i === activeImageIndex ? 'active' : ''}`} onClick={() => setActiveImageIndex(i)}>
                          <img src={img} alt={`Thumb ${i + 1}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                  <p>No image previews available</p>
                </div>
              )}
            </div>

            {/* §9.2-9.5 — Detection Summary with editable fields */}
            <div className="detail-section glass-strong">
              <h3><FileText size={18} /> Detection Results</h3>
              {effectiveRegions.map((region, i) => (
                <div key={i} className="detection-item">
                  <div className="detection-item-header">
                    <span className="detection-part">{PARTS_DB[region.part]?.name || region.part}</span>
                    <span className={`badge badge-dot ${region.severity === 'minor' ? 'badge-approved' : region.severity === 'moderate' ? 'badge-review' : 'badge-fraud'}`}>
                      {region.severity}
                    </span>
                  </div>
                  <div className="detection-details">
                    <div className="detection-field">
                      <span>Type</span>
                      {editingField === `type_${i}` ? (
                        <div className="inline-edit">
                          <select className="form-input" value={editValue} onChange={e => setEditValue(e.target.value)} style={{ padding: '4px 8px', fontSize: '0.82rem' }}>
                            {['scratch', 'dent', 'crack', 'shatter', 'structural_deformation'].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <button className="btn btn-sm btn-primary" onClick={() => saveEdit(`type_${i}`, regions[i].damage_type)}><Save size={12} /></button>
                          <button className="btn btn-sm btn-outline" onClick={cancelEdit}><X size={12} /></button>
                        </div>
                      ) : (
                        <strong>
                          {(claim.overrides?.[`type_${i}`]) || region.damage_type}
                          <button className="edit-btn" onClick={() => startEdit(`type_${i}`, region.damage_type)}><Edit3 size={11} /></button>
                        </strong>
                      )}
                    </div>
                    <div className="detection-field">
                      <span>Confidence</span>
                      <div className="mini-meter">
                        <div className="mini-meter-bar" style={{ width: '80px' }}>
                          <div className="mini-meter-fill" style={{ width: `${(region.confidence || 0) * 100}%`, background: region.confidence >= 0.85 ? 'var(--color-emerald)' : region.confidence >= 0.6 ? 'var(--color-amber)' : 'var(--color-ruby)' }} />
                        </div>
                        <span>{((region.confidence || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    {region.dent_depth && (
                      <div className="detection-field">
                        <span>Depth</span>
                        <strong>{region.dent_depth}</strong>
                      </div>
                    )}
                    {region.impact_angle && (
                      <div className="detection-field">
                        <span>Angle</span>
                        <strong>{region.impact_angle}</strong>
                      </div>
                    )}
                  </div>
                  {region.description && <p className="detection-desc">{region.description}</p>}
                  {imagePreviews.length > 0 && (() => {
                    const bbox = region.bbox || [25, 25, 50, 50];
                    const cx = Math.min(100, Math.max(0, bbox[0] + (bbox[2] / 2)));
                    const cy = Math.min(100, Math.max(0, bbox[1] + (bbox[3] / 2)));
                    const scale = 10000 / Math.max(10, bbox[2]); // Zoom factor based on width
                    
                    return (
                      <div className="detection-crop" style={{ 
                        width: '100%', 
                        height: '160px', 
                        borderRadius: '8px', 
                        marginTop: '12px', 
                        backgroundColor: '#0f172a',
                        backgroundImage: `url(${imagePreviews[0]})`,
                        backgroundPosition: `${cx}% ${cy}%`,
                        backgroundSize: `${scale}% auto`,
                        backgroundRepeat: 'no-repeat',
                        border: '1px solid rgba(15,23,42,0.1)'
                      }} title={`Damaged Area: ${region.part}`} />
                    );
                  })()}
                </div>
              ))}

              {/* §9.5 — Reason bullets */}
              {results.reason && results.reason.length > 0 && (
                <div className="reason-list">
                  <h5>Reasoning</h5>
                  <ul>
                    {results.reason.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* §9 — Explainable Cost Breakdown */}
            <div className="detail-section glass-strong">
              <h3>
                <span>Cost Breakdown {hasOverrides && '(Recalculated)'}</span>
                <span className="cost-total">{formatCurrency(costBreakdown?.total || results.estimated_cost)}</span>
              </h3>
              {costBreakdown?.lineItems ? (
                <table className="data-table cost-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style={{ textAlign: 'right' }}>Cost ({CURRENCY_SYMBOL})</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costBreakdown.lineItems.map((item, i) => (
                      <tr key={i}>
                        <td>{item.item}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.cost)}</td>
                        <td><span className="source-tag">{item.source}</span></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td><strong>Total</strong></td>
                      <td style={{ textAlign: 'right' }}><strong>{formatCurrency(costBreakdown.total)}</strong></td>
                      <td><span className="source-tag">{costBreakdown.pricingVersion}</span></td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p style={{ color: 'var(--color-text-tertiary)' }}>Cost breakdown not available</p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="detail-right">
            {/* §9 — Risk Score Panel */}
            <div className="detail-section glass-strong">
              <h3>Risk Scores</h3>
              <div className="risk-scores-grid">
                <div className="risk-score-item">
                  <ScoreGauge value={(riskScores.damage_score || 0) * 100} label="Damage" color={riskScores.damage_score > 0.7 ? 'ruby' : riskScores.damage_score > 0.4 ? 'amber' : 'emerald'} />
                </div>
                <div className="risk-score-item">
                  <ScoreGauge value={(riskScores.fraud_score || 0) * 100} label="Fraud" color="ruby" />
                </div>
                <div className="risk-score-item">
                  <ScoreGauge value={(riskScores.confidence || 0) * 100} label="Confidence" color="accent" />
                </div>
                <div className="risk-score-item">
                  <ScoreGauge value={(riskScores.approval_probability || 0) * 100} label="Approval" color="emerald" />
                </div>
              </div>
              <div className="risk-extras">
                <div className="risk-extra-item">
                  <span>Repair Complexity</span>
                  <strong className={`complexity-${riskScores.repair_complexity}`}>
                    {(riskScores.repair_complexity || 'N/A').toUpperCase()}
                  </strong>
                </div>
                <div className="risk-extra-item">
                  <span>Est. Repair Time</span>
                  <strong>{riskScores.time_to_repair_days || 'N/A'} day{riskScores.time_to_repair_days !== 1 ? 's' : ''}</strong>
                </div>
              </div>
            </div>

            {/* Fraud Analysis Detail */}
            {fraudAnalysis && (
              <div className="detail-section glass-strong">
                <h3>
                  <Shield size={18} />
                  Fraud Analysis
                  <span className={`badge badge-dot ${fraudAnalysis.riskLevel === 'high' ? 'badge-fraud' : fraudAnalysis.riskLevel === 'medium' ? 'badge-review' : 'badge-approved'}`}>
                    {fraudAnalysis.riskLevel} risk
                  </span>
                </h3>
                <div className="fraud-composite">
                  <ScoreGauge value={fraudAnalysis.score} label="Score" color="ruby" size={100} />
                  <p className="fraud-rec">{fraudAnalysis.recommendation}</p>
                </div>
                <div className="fraud-signals">
                  {fraudAnalysis.signals?.map((signal, i) => (
                    <div key={i} className="fraud-signal-item">
                      <div className="fraud-signal-header">
                        <span className="fraud-signal-icon">{signal.icon}</span>
                        <span className="fraud-signal-type">{signal.type}</span>
                        <span className="fraud-signal-score">{signal.score}/100</span>
                      </div>
                      <p>{signal.detail}</p>
                      <div className="progress-bar" style={{ marginTop: '4px' }}>
                        <div className={`progress-bar-fill ${signal.score > 50 ? 'danger' : signal.score > 25 ? 'warning' : 'success'}`} style={{ width: `${signal.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Incident Info */}
            <div className="detail-section glass-strong">
              <h3>Incident Details</h3>
              <div className="incident-details">
                <div><span>Type</span><strong>{claim.incident?.type?.replace(/_/g, ' ')}</strong></div>
                <div><span>Date</span><strong>{claim.incident?.date}</strong></div>
                <div><span>Location</span><strong>{claim.incident?.location || 'N/A'}</strong></div>
                <div className="full-width"><span>Description</span><p>{claim.incident?.description}</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* §9 — Audit Trail / Full Reasoning Trace */}
        <div className="detail-section glass-strong audit-section">
          <button className="expand-panel-header" onClick={() => setShowAuditTrail(!showAuditTrail)} type="button">
            <div className="expand-panel-title">
              <Brain size={18} />
              View Full Reasoning Trace (Audit Trail)
            </div>
            {showAuditTrail ? <ChevronUp size={18} className="expand-panel-chevron" /> : <ChevronDown size={18} className="expand-panel-chevron" />}
          </button>
          {showAuditTrail && (
            <div className="audit-content" style={{ padding: 'var(--space-5)' }}>
              {/* Predictor Output */}
              <div className="audit-agent-section">
                <div className="audit-agent-header predictor">
                  <Eye size={16} />
                  <h5>Agent 1 — Predictor</h5>
                </div>
                <div className="audit-body">
                  <p><strong>Damage Summary:</strong> {agentOutputs.predictor?.damage_summary || disagreementLog.predictor_summary || 'N/A'}</p>
                  <p><strong>Vehicle Overview:</strong> {agentOutputs.predictor?.vehicle_overview || 'N/A'}</p>
                  <p><strong>Draft Cost:</strong> {formatCurrency(agentOutputs.predictor?.draft_cost_estimate)}</p>
                  <p><strong>Regions Detected:</strong> {agentOutputs.predictor?.damage_regions?.length || 0}</p>
                  <pre className="audit-json">{JSON.stringify(agentOutputs.predictor?.damage_regions || [], null, 2)}</pre>
                </div>
              </div>

              {/* Contradictor Output */}
              <div className="audit-agent-section">
                <div className="audit-agent-header contradictor">
                  <Shield size={16} />
                  <h5>Agent 2 — Contradictor</h5>
                </div>
                <div className="audit-body">
                  <p><strong>Overall Assessment:</strong> {agentOutputs.contradictor?.overall_assessment || 'N/A'}</p>
                  <p><strong>Agreement Level:</strong> {((agentOutputs.contradictor?.agreement_level || 0) * 100).toFixed(0)}%</p>
                  <p><strong>Fraud Signal Score:</strong> {((agentOutputs.contradictor?.fraud_signal_score || 0) * 100).toFixed(0)}%</p>
                  <h6>Challenges ({(disagreementLog.contradictor_challenges || agentOutputs.contradictor?.challenges || []).length})</h6>
                  {(disagreementLog.contradictor_challenges || agentOutputs.contradictor?.challenges || []).map((c, i) => (
                    <div key={i} className="audit-challenge">
                      <span className={`badge badge-dot ${c.severity === 'high' ? 'badge-fraud' : c.severity === 'medium' ? 'badge-review' : 'badge-approved'}`}>
                        {c.severity} · {c.type}
                      </span>
                      <p>{c.detail}</p>
                    </div>
                  ))}
                  {/* Physics Validation */}
                  {disagreementLog.physics_validation && (
                    <div style={{ marginTop: 'var(--space-4)' }}>
                      <h6>Physics Validation</h6>
                      <p><strong>Verdict:</strong> {disagreementLog.physics_validation.verdict}</p>
                      <p><strong>Est. Speed:</strong> {disagreementLog.physics_validation.estimatedSpeedRange}</p>
                      <p><strong>Direction:</strong> {disagreementLog.physics_validation.estimatedDirection}</p>
                      <p>{disagreementLog.physics_validation.summary}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Arbiter Output */}
              <div className="audit-agent-section">
                <div className="audit-agent-header arbiter">
                  <Brain size={16} />
                  <h5>Agent 3 — Arbiter</h5>
                </div>
                <div className="audit-body">
                  <p><strong>Arbitration Summary:</strong> {results.arbitration_summary || 'N/A'}</p>
                  <p><strong>Final Recommendation:</strong> {results.recommendation?.replace(/_/g, ' ')}</p>
                  <p><strong>Final Confidence:</strong> {((results.confidence || 0) * 100).toFixed(0)}%</p>
                  <h6>Challenge Resolutions</h6>
                  {(results.challenge_resolutions || []).map((r, i) => (
                    <div key={i} className="audit-resolution">
                      <span className={`badge badge-dot ${r.resolution === 'upheld' ? 'badge-fraud' : r.resolution === 'overridden' ? 'badge-approved' : 'badge-review'}`}>
                        {r.resolution} · {r.challenge_type}
                      </span>
                      <p>{r.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
