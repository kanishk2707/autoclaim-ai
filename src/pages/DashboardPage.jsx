import { Link } from 'react-router-dom';
import { BarChart3, Clock, CheckCircle, AlertTriangle, ShieldAlert, FileText, ChevronRight, Trash2, TrendingUp, RefreshCw } from 'lucide-react';
import { useClaims } from '../context/ClaimContext';
import { getFeedbackStats, getModelVersions, simulateRetraining, promoteModel } from '../data/feedbackLoop';
import { useState } from 'react';
import './DashboardPage.css';

const STATUS_CONFIG = {
  approved: { label: 'Approved', class: 'badge-approved', icon: <CheckCircle size={12} /> },
  review: { label: 'Needs Review', class: 'badge-review', icon: <Clock size={12} /> },
  siu: { label: 'SIU Escalation', class: 'badge-fraud', icon: <ShieldAlert size={12} /> },
  processing: { label: 'Processing', class: 'badge-processing', icon: <Clock size={12} /> },
  error: { label: 'Error', class: 'badge-fraud', icon: <AlertTriangle size={12} /> },
  rejected: { label: 'Rejected', class: 'badge-fraud', icon: <AlertTriangle size={12} /> },
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
}

function timeAgo(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function DashboardPage() {
  const { state, dispatch } = useClaims();
  const [showML, setShowML] = useState(false);
  const [retrainResult, setRetrainResult] = useState(null);

  const claims = state.claims;
  const approved = claims.filter(c => c.status === 'approved').length;
  const review = claims.filter(c => c.status === 'review').length;
  const siu = claims.filter(c => c.status === 'siu').length;
  const processing = claims.filter(c => c.status === 'processing').length;

  const totalCost = claims.reduce((sum, c) => sum + (c.results?.estimated_cost || 0), 0);

  const feedbackStats = getFeedbackStats();
  const modelVersions = getModelVersions();
  const currentModel = modelVersions.find(v => v.status === 'production') || modelVersions[0];

  const handleRetrain = () => {
    const result = simulateRetraining();
    setRetrainResult(result);
  };

  const handlePromote = (version) => {
    promoteModel(version);
    setRetrainResult(null);
  };

  return (
    <div className="page dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1 className="page-title">Adjuster Dashboard</h1>
            <p className="page-subtitle">Review, override, and approve vehicle damage claims</p>
          </div>
          <div className="dashboard-header-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setShowML(!showML)}>
              <TrendingUp size={14} />
              {showML ? 'Hide' : 'Show'} ML Pipeline
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
          {[
            { label: 'Total Claims', value: claims.length, icon: <FileText size={18} />, color: 'accent' },
            { label: 'Approved', value: approved, icon: <CheckCircle size={18} />, color: 'emerald' },
            { label: 'Pending Review', value: review + processing, icon: <Clock size={18} />, color: 'amber' },
            { label: 'SIU Flagged', value: siu, icon: <ShieldAlert size={18} />, color: 'ruby' },
          ].map((stat, i) => (
            <div className="stat-card glass" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className={`stat-card-icon ${stat.color}`}>
                {stat.icon}
              </div>
              <div className="stat-card-label">{stat.label}</div>
              <div className="stat-card-value">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* ML Pipeline Panel (§8) */}
        {showML && (
          <div className="ml-panel glass-strong" style={{ marginBottom: 'var(--space-8)' }}>
            <h3 style={{ marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} /> Continual Learning Pipeline
            </h3>

            <div className="grid-3" style={{ marginBottom: 'var(--space-6)' }}>
              <div className="ml-stat glass-subtle" style={{ padding: 'var(--space-5)' }}>
                <div className="stat-card-label">Current Model</div>
                <div className="stat-card-value" style={{ fontSize: '1.3rem' }}>{currentModel?.version || 'v1.0'}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>Status: {currentModel?.status}</div>
              </div>
              <div className="ml-stat glass-subtle" style={{ padding: 'var(--space-5)' }}>
                <div className="stat-card-label">Surveyor Corrections</div>
                <div className="stat-card-value" style={{ fontSize: '1.3rem' }}>{feedbackStats.totalCorrections}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>{feedbackStats.unusedCorrections} unused</div>
              </div>
              <div className="ml-stat glass-subtle" style={{ padding: 'var(--space-5)' }}>
                <div className="stat-card-label">Retraining Runs</div>
                <div className="stat-card-value" style={{ fontSize: '1.3rem' }}>{feedbackStats.retrainingRuns}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                  {feedbackStats.lastRetrainingAt ? `Last: ${timeAgo(feedbackStats.lastRetrainingAt)}` : 'Never run'}
                </div>
              </div>
            </div>

            {/* Model Metrics */}
            {currentModel?.metrics && (
              <div className="ml-metrics" style={{ marginBottom: 'var(--space-6)' }}>
                <h5 style={{ marginBottom: 'var(--space-3)', fontSize: '0.9rem' }}>Model Performance Metrics</h5>
                <div className="grid-4">
                  {[
                    { label: 'Cost MAE', value: `₹${Math.round(currentModel.metrics.costMAE).toLocaleString()}`, desc: 'Mean Absolute Error' },
                    { label: 'Severity Accuracy', value: `${(currentModel.metrics.severityAccuracy * 100).toFixed(1)}%`, desc: 'Classification accuracy' },
                    { label: 'Fraud Precision', value: `${(currentModel.metrics.fraudPrecision * 100).toFixed(1)}%`, desc: 'True positive rate' },
                    { label: 'Fraud Recall', value: `${(currentModel.metrics.fraudRecall * 100).toFixed(1)}%`, desc: 'Detection coverage' },
                  ].map((m, i) => (
                    <div key={i} className="glass-subtle" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</div>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, margin: '4px 0' }}>{m.value}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)' }}>{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Model Versions Registry */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <h5 style={{ marginBottom: 'var(--space-3)', fontSize: '0.9rem' }}>Model Version Registry</h5>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Trained</th>
                    <th>Corrections Used</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {modelVersions.slice().reverse().map((v, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{v.version}</td>
                      <td>
                        <span className={`badge badge-dot ${v.status === 'production' ? 'badge-approved' : v.status === 'challenger' ? 'badge-processing' : 'badge-review'}`}>
                          {v.status}
                        </span>
                      </td>
                      <td>{timeAgo(v.trainedAt)}</td>
                      <td>{v.correctionsUsed}</td>
                      <td>
                        {v.status === 'challenger' && (
                          <button className="btn btn-sm btn-success" onClick={() => handlePromote(v.version)}>
                            Promote
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-actions">
              <button className="btn btn-primary btn-sm" onClick={handleRetrain} disabled={feedbackStats.unusedCorrections === 0}>
                <RefreshCw size={14} />
                {feedbackStats.unusedCorrections > 0
                  ? `Retrain (${feedbackStats.unusedCorrections} corrections)`
                  : 'No corrections available'}
              </button>
              {retrainResult && (
                <div className={`ml-result glass-subtle ${retrainResult.success ? '' : 'error'}`}>
                  {retrainResult.success
                    ? `✅ ${retrainResult.message}`
                    : `⚠️ ${retrainResult.message}`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Claims Table */}
        <div className="claims-table-wrapper glass-strong">
          <div className="claims-table-header">
            <h3>All Claims</h3>
            <div className="claims-table-meta">
              {claims.length > 0 && <span>{claims.length} claim{claims.length !== 1 ? 's' : ''} · {formatCurrency(totalCost)} total estimated</span>}
            </div>
          </div>

          {claims.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <h4>No claims yet</h4>
              <p>Submit your first claim to see it appear here.</p>
              <Link to="/submit" className="btn btn-primary">Submit a Claim</Link>
            </div>
          ) : (
            <table className="data-table claims-table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Cost Estimate</th>
                  <th>Confidence</th>
                  <th>Fraud Score</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => {
                  const status = STATUS_CONFIG[claim.status] || STATUS_CONFIG.processing;
                  const results = claim.results;
                  return (
                    <tr key={claim.id}>
                      <td>
                        <Link to={`/claim/${claim.id}`} className="claim-id-link">
                          {results?.claim_id || claim.id.slice(0, 15)}
                        </Link>
                      </td>
                      <td>
                        <div className="claim-vehicle">
                          <strong>{claim.vehicle?.make} {claim.vehicle?.model}</strong>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-dot ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {results ? formatCurrency(results.estimated_cost) : '—'}
                      </td>
                      <td>
                        {results ? (
                          <div className="mini-meter">
                            <div className="mini-meter-bar">
                              <div className="mini-meter-fill" style={{ width: `${(results.confidence || 0) * 100}%` }} />
                            </div>
                            <span>{((results.confidence || 0) * 100).toFixed(0)}%</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        {results?.fraud_analysis ? (
                          <span className={`fraud-score ${results.fraud_analysis.riskLevel}`}>
                            {results.fraud_analysis.score}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="time-cell">{timeAgo(claim.submittedAt)}</td>
                      <td>
                        <div className="claim-actions">
                          <Link to={`/claim/${claim.id}`} className="btn btn-glass btn-sm btn-icon">
                            <ChevronRight size={14} />
                          </Link>
                          <button
                            className="btn btn-outline btn-sm btn-icon"
                            onClick={() => dispatch({ type: 'DELETE_CLAIM', payload: claim.id })}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
