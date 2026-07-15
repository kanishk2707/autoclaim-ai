import { Link } from 'react-router-dom';
import { Shield, Upload, BarChart3, Brain, Zap, Eye, ArrowRight, CheckCircle2, Lock, TrendingUp } from 'lucide-react';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge glass-subtle">
              <Zap size={14} />
              <span>AI-Powered Claims Intelligence</span>
            </div>
            <h1 className="hero-title">
              Intelligent Vehicle<br />
              <span className="hero-highlight">Damage Assessment</span>
            </h1>
            <p className="hero-description">
              Tri-agent AI system that detects, validates, and adjudicates vehicle damage claims
              with explainable confidence — replacing weeks of manual surveyor inspection with
              seconds of intelligent analysis.
            </p>
            <div className="hero-actions">
              <Link to="/submit" className="btn btn-primary btn-lg" id="hero-submit-btn">
                <Upload size={18} />
                Submit a Claim
              </Link>
              <Link to="/dashboard" className="btn btn-glass btn-lg" id="hero-dashboard-btn">
                <BarChart3 size={18} />
                Adjuster Dashboard
              </Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">15s</span>
                <span className="hero-stat-label">Avg. Assessment</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value">94%</span>
                <span className="hero-stat-label">Accuracy Rate</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value">3-Agent</span>
                <span className="hero-stat-label">Cross-Validation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>How AutoClaim AI Works</h2>
            <p>Three specialized AI agents collaborate to produce a debated, cross-checked verdict — not just one model's raw output.</p>
          </div>
          <div className="agents-flow">
            <div className="agent-flow-card glass" style={{ animationDelay: '0.1s' }}>
              <div className="agent-flow-icon predictor-icon">
                <Eye size={24} />
              </div>
              <h4>Agent 1 — Predictor</h4>
              <p>Detects damaged regions, classifies damage type & severity, and drafts a cost estimate from the standardized pricing database.</p>
              <div className="agent-flow-tag">Proposes</div>
            </div>
            <div className="agent-flow-arrow">
              <ArrowRight size={20} />
            </div>
            <div className="agent-flow-card glass" style={{ animationDelay: '0.2s' }}>
              <div className="agent-flow-icon contradictor-icon">
                <Shield size={24} />
              </div>
              <h4>Agent 2 — Contradictor</h4>
              <p>Adversarially stress-tests the Predictor's findings. Checks physics consistency, flags fraud signals, and challenges low-confidence areas.</p>
              <div className="agent-flow-tag warning">Challenges</div>
            </div>
            <div className="agent-flow-arrow">
              <ArrowRight size={20} />
            </div>
            <div className="agent-flow-card glass" style={{ animationDelay: '0.3s' }}>
              <div className="agent-flow-icon arbiter-icon">
                <Brain size={24} />
              </div>
              <h4>Agent 3 — Arbiter</h4>
              <p>Reconciles conflicts, produces the final verdict with human-readable reasoning, confidence score, and actionable recommendation.</p>
              <div className="agent-flow-tag success">Resolves</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <h2>Built for Trust & Transparency</h2>
            <p>Every number on screen traces back to a visible reason. No black boxes.</p>
          </div>
          <div className="features-grid">
            {[
              { icon: <Eye size={22} />, title: 'Damage Detection', desc: 'Computer vision identifies scratches, dents, cracks, shatters, and structural deformation with part-level precision.' },
              { icon: <Zap size={22} />, title: 'Physics Validation', desc: 'Estimates impact speed & direction from deformation geometry. Flags when damage doesn\'t match the claimed incident.' },
              { icon: <Shield size={22} />, title: 'Fraud Detection', desc: 'Multi-signal fraud scoring: duplicate images, metadata forensics, claim history patterns, and physics inconsistency.' },
              { icon: <BarChart3 size={22} />, title: 'Cost Breakdown', desc: 'Line-item cost estimation (parts, labor, paint, GST) traceable to a standardized pricing database — not a lump number.' },
              { icon: <CheckCircle2 size={22} />, title: 'Explainable Verdicts', desc: 'Every recommendation carries a human-readable reason string. View the full Predictor → Contradictor → Arbiter debate.' },
              { icon: <TrendingUp size={22} />, title: 'Continual Learning', desc: 'Surveyor corrections feed a retraining pipeline. Model accuracy compounds over time with champion/challenger deployment.' },
              { icon: <Lock size={22} />, title: 'Audit Trail', desc: 'Every claim is reconstructable from stored agent logs. Full regulatory compliance with versioned, reproducible assessments.' },
              { icon: <Brain size={22} />, title: 'Smart Routing', desc: 'Auto-approve low-risk claims. Route complex cases to human review. Escalate fraud signals to SIU — all configurable.' },
            ].map((feature, i) => (
              <div className="feature-card glass" key={i} style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="feature-icon">{feature.icon}</div>
                <h5>{feature.title}</h5>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="container">
          <div className="cta-card glass-strong">
            <h2>Ready to Automate Claims Assessment?</h2>
            <p>Upload vehicle damage photos and get an AI-powered, explainable assessment in under 15 seconds.</p>
            <Link to="/submit" className="btn btn-primary btn-lg">
              <Upload size={18} />
              Submit Your First Claim
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
