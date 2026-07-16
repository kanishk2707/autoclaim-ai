import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Eye, Shield, Brain, CheckCircle, Loader, AlertTriangle } from 'lucide-react';
import { useClaims } from '../context/ClaimContext';
import { runTriAgentPipeline } from '../agents/orchestrator';
import './ProcessingPage.css';

const AGENTS = [
  { key: 'predictor', name: 'Predictor', subtitle: 'Damage Detection & Classification', icon: <Eye size={22} />, color: 'accent' },
  { key: 'contradictor', name: 'Contradictor', subtitle: 'Adversarial Review & Fraud Screening', icon: <Shield size={22} />, color: 'amber' },
  { key: 'arbiter', name: 'Arbiter', subtitle: 'Final Verdict & Explainable Reasoning', icon: <Brain size={22} />, color: 'emerald' },
];

export default function ProcessingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { dispatch, state } = useClaims();

  const [activeAgent, setActiveAgent] = useState(-1);
  const [agentStatuses, setAgentStatuses] = useState(['waiting', 'waiting', 'waiting']);
  const [messages, setMessages] = useState(['Initializing tri-agent pipeline...']);
  const [error, setError] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [resultClaimId, setResultClaimId] = useState(null);

  const { images, imagePreviews, incident, vehicle, claimId } = location.state || {};
  const { id: routeClaimId } = useParams();

  // Keep a ref to the latest claims to avoid stale closure in async callback
  const claimsRef = useRef(state.claims);
  useEffect(() => { claimsRef.current = state.claims; }, [state.claims]);

  useEffect(() => {
    if (!images || images.length === 0) {
      navigate('/submit');
      return;
    }

    const run = async () => {
      try {
        const result = await runTriAgentPipeline({
          images: imagePreviews && imagePreviews.length > 0 ? imagePreviews.map(p => typeof p === 'string' ? p : p.url).filter(Boolean) : images,
          incidentDescription: incident?.description || '',
          vehicleInfo: {
            ...vehicle,
            incidentDate: incident?.date,
            incidentLocation: incident?.location,
            incidentType: incident?.type,
          },
          onProgress: (stage, message, agentIndex) => {
            setMessages(prev => [...prev.slice(-8), message]);

            if (stage === 'predictor') {
              setActiveAgent(0);
              setAgentStatuses(prev => { const n = [...prev]; n[0] = 'running'; return n; });
            } else if (stage === 'predictor_done') {
              setAgentStatuses(prev => { const n = [...prev]; n[0] = 'done'; return n; });
            } else if (stage === 'contradictor') {
              setActiveAgent(1);
              setAgentStatuses(prev => { const n = [...prev]; n[1] = 'running'; return n; });
            } else if (stage === 'contradictor_done') {
              setAgentStatuses(prev => { const n = [...prev]; n[1] = 'done'; return n; });
            } else if (stage === 'arbiter') {
              setActiveAgent(2);
              setAgentStatuses(prev => { const n = [...prev]; n[2] = 'running'; return n; });
            } else if (stage === 'arbiter_done') {
              setAgentStatuses(prev => { const n = [...prev]; n[2] = 'done'; return n; });
            }
          },
        });

        if (result.success) {
          // Use ref to get the latest claims (avoids stale closure)
          const latestClaims = claimsRef.current;
          const targetClaim = latestClaims.find(c => c.id === routeClaimId) || latestClaims[0];
          if (targetClaim) {
            // Normalize image previews to plain URL strings before saving
            result.imagePreviews = (imagePreviews || []).map(p => typeof p === 'string' ? p : p.url).filter(Boolean);
            result.vehicle = vehicle;
            result.incident = incident;
            dispatch({
              type: 'SET_RESULTS',
              payload: { claimId: targetClaim.id, results: result },
            });
            setResultClaimId(targetClaim.id);
          }
          setCompleted(true);
          setMessages(prev => [...prev, `✅ Assessment complete — ${result.recommendation.replace(/_/g, ' ')}`]);

          // Navigate to detail after brief delay
          setTimeout(() => {
            if (targetClaim) navigate(`/claim/${targetClaim.id}`);
          }, 2500);
        } else {
          setError(result.error);
          const latestClaims = claimsRef.current;
          const targetClaim = latestClaims.find(c => c.id === routeClaimId) || latestClaims[0];
          if (targetClaim) {
            dispatch({ type: 'SET_ERROR', payload: { claimId: targetClaim.id, error: result.error } });
          }
        }
      } catch (err) {
        setError(err.message);
        const latestClaims = claimsRef.current;
        const targetClaim = latestClaims.find(c => c.id === routeClaimId) || latestClaims[0];
        if (targetClaim) {
          dispatch({ type: 'SET_ERROR', payload: { claimId: targetClaim.id, error: err.message } });
        }
      }
    };

    run();
  }, []); // eslint-disable-line

  return (
    <div className="page processing-page">
      <div className="container container-sm">
        <div className="processing-header">
          <h1 className="page-title">Analyzing Claim</h1>
          <p className="page-subtitle">Three AI agents are reviewing your damage photos</p>
        </div>

        {/* Agent Cards */}
        <div className="processing-agents">
          {AGENTS.map((agent, i) => (
            <div
              key={agent.key}
              className={`agent-card glass ${agentStatuses[i] === 'running' ? 'active' : ''} ${agentStatuses[i] === 'done' ? 'completed' : ''}`}
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              {agentStatuses[i] === 'running' && <div className="agent-card-pulse" />}
              <div className="agent-card-header">
                <div className={`agent-card-icon ${agent.key}`}>
                  {agent.icon}
                </div>
                <div>
                  <div className="agent-card-title">Agent {i + 1} — {agent.name}</div>
                  <div className="agent-card-subtitle">{agent.subtitle}</div>
                </div>
              </div>
              <div className={`agent-card-status ${agentStatuses[i]}`}>
                {agentStatuses[i] === 'waiting' && (
                  <><div className="status-dot waiting" /> Waiting</>
                )}
                {agentStatuses[i] === 'running' && (
                  <><div className="spinner spinner-sm" /> Processing...</>
                )}
                {agentStatuses[i] === 'done' && (
                  <><CheckCircle size={16} /> Complete</>
                )}
              </div>
              {agentStatuses[i] !== 'waiting' && (
                <div className="progress-bar" style={{ marginTop: '12px' }}>
                  <div
                    className={`progress-bar-fill ${agentStatuses[i] === 'done' ? 'success' : ''}`}
                    style={{ width: agentStatuses[i] === 'done' ? '100%' : '60%', transition: 'width 2s ease' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Live Messages */}
        <div className="processing-log glass-subtle">
          <h5>Live Analysis Log</h5>
          <div className="log-messages">
            {messages.map((msg, i) => (
              <div key={i} className="log-message" style={{ animationDelay: `${i * 0.05}s` }}>
                <span className="log-dot" />
                <span>{msg}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="processing-error glass">
            <AlertTriangle size={20} />
            <div>
              <h5>Analysis Failed</h5>
              <p>{error}</p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/submit')}>Try Again</button>
          </div>
        )}

        {/* Completed */}
        {completed && (
          <div className="processing-complete">
            <CheckCircle size={32} />
            <p>Redirecting to results...</p>
          </div>
        )}
      </div>
    </div>
  );
}
