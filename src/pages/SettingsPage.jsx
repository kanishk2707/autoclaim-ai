import { useState, useEffect } from 'react';
import { Key, Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load existing keys from local storage on mount
    const savedGroq = localStorage.getItem('autoclaim_groq_keys') || '';
    const savedGemini = localStorage.getItem('autoclaim_gemini_key') || '';
    setGroqKey(savedGroq);
    setGeminiKey(savedGemini);
  }, []);

  const handleSave = () => {
    if (groqKey.trim()) {
      localStorage.setItem('autoclaim_groq_keys', groqKey.trim());
    } else {
      localStorage.removeItem('autoclaim_groq_keys');
    }

    if (geminiKey.trim()) {
      localStorage.setItem('autoclaim_gemini_key', geminiKey.trim());
    } else {
      localStorage.removeItem('autoclaim_gemini_key');
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="page settings-page">
      <div className="container container-sm">
        <div className="page-header" style={{ textAlign: 'center' }}>
          <h1 className="page-title"><Key size={28} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '8px' }} /> Settings</h1>
          <p className="page-subtitle">Configure your personal API keys for local AI processing.</p>
        </div>

        <div className="glass-strong" style={{ padding: 'var(--space-6)', borderRadius: '12px' }}>
          <div className="alert-box alert-info" style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'rgba(56, 189, 248, 0.1)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--color-accent)' }}>
            <AlertCircle size={20} color="var(--color-accent)" style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              <strong>Bring Your Own Key (BYOK)</strong><br/>
              Your keys are stored securely in your browser's local storage and are never sent to any server other than the official Groq and Gemini APIs. 
            </p>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Groq API Key (Required)
            </label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="gsk_..." 
              value={groqKey} 
              onChange={(e) => setGroqKey(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.5)', color: 'white' }}
            />
            <p style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
              Used as the primary AI engine for image analysis and fraud detection. You can provide multiple keys separated by commas for rotation.
            </p>
          </div>

          <div className="form-group" style={{ marginBottom: '30px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Gemini API Key (Optional Fallback)
            </label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="AIza..." 
              value={geminiKey} 
              onChange={(e) => setGeminiKey(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.5)', color: 'white' }}
            />
            <p style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
              Used as a fallback if the Groq API rate limits are exceeded.
            </p>
          </div>

          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px' }}
          >
            {saved ? <><CheckCircle size={18} /> Saved successfully!</> : <><Save size={18} /> Save Keys</>}
          </button>
        </div>
      </div>
    </div>
  );
}
