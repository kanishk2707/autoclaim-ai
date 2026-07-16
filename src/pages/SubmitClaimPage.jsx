import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Camera, Car, FileText, CheckCircle, ChevronRight, ChevronLeft, AlertCircle, Zap } from 'lucide-react';
import { useClaims } from '../context/ClaimContext';
import { isGroqAvailable } from '../api/groqService';
import { isGeminiAvailable } from '../api/geminiService';
import './SubmitClaimPage.css';

const VEHICLE_MAKES = ['Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 'Kia', 'Toyota', 'Honda', 'MG', 'Skoda', 'Volkswagen', 'BMW', 'Mercedes-Benz', 'Audi', 'Other'];
const INCIDENT_TYPES = [
  { value: 'parking_scratch', label: 'Parking Lot Scratch/Bump' },
  { value: 'low_speed_collision', label: 'Low-Speed Collision' },
  { value: 'rear_end', label: 'Rear-End Collision' },
  { value: 'side_impact', label: 'Side Impact / T-Bone' },
  { value: 'head_on', label: 'Head-On Collision' },
  { value: 'hit_and_run', label: 'Hit and Run' },
  { value: 'vandalism', label: 'Vandalism' },
  { value: 'natural_disaster', label: 'Natural Disaster / Weather' },
  { value: 'rollover', label: 'Rollover' },
];
const SEGMENTS = [
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'luxury_sedan', label: 'Luxury Sedan' },
  { value: 'luxury_suv', label: 'Luxury SUV' },
  { value: 'sports', label: 'Sports Car' },
  { value: 'commercial', label: 'Commercial Vehicle' },
];

export default function SubmitClaimPage() {
  const [step, setStep] = useState(0);
  const [vehicle, setVehicle] = useState({ make: '', model: '', year: new Date().getFullYear(), segment: 'sedan', phone: '', email: '' });
  const [incident, setIncident] = useState({ type: '', date: '', time: '', location: '', description: '' });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const imagesRef = useRef(images);
  
  // Keep ref in sync with state for synchronous callbacks
  imagesRef.current = images;

  const navigate = useNavigate();
  const { dispatch } = useClaims();

  const steps = [
    { label: 'Vehicle', icon: <Car size={16} /> },
    { label: 'Incident', icon: <FileText size={16} /> },
    { label: 'Photos', icon: <Camera size={16} /> },
    { label: 'Review', icon: <CheckCircle size={16} /> },
  ];

  const handleImageUpload = useCallback((e) => {
    const files = Array.from(e.target.files || e.dataTransfer?.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/'));

    if (imagesRef.current.length + validFiles.length > 10) {
      setErrors(prev => ({ ...prev, images: 'Maximum 10 images allowed' }));
      return;
    }

    setImages(prev => [...prev, ...validFiles]);

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews(prev => [...prev, { url: ev.target.result, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });

    setErrors(prev => ({ ...prev, images: undefined }));
  }, []);

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    handleImageUpload(e);
  }, [handleImageUpload]);

  const validateStep = () => {
    const newErrors = {};

    if (step === 0) {
      if (!vehicle.make) newErrors.make = 'Required';
      if (!vehicle.model) newErrors.model = 'Required';
    } else if (step === 1) {
      if (!incident.type) newErrors.type = 'Required';
      if (!incident.date) newErrors.date = 'Required';
      if (!incident.description) newErrors.description = 'Required';
    } else if (step === 2) {
      if (images.length === 0) newErrors.images = 'Please upload at least one damage photo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) setStep(s => Math.min(s + 1, 3));
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!validateStep()) return;

    if (!isGroqAvailable() && !isGeminiAvailable()) {
      if (window.confirm('No AI API keys configured. You need to provide your own API key to run the pipeline locally. Go to Settings now?')) {
        navigate('/settings');
      }
      return;
    }

    setSubmitting(true);

    const claimId = `CLM-${Date.now()}`;
    const claimData = {
      id: claimId,
      vehicle,
      incident,
      imageCount: images.length,
      imagePreviews: imagePreviews.map(p => p.url),
    };

    dispatch({ type: 'SUBMIT_CLAIM', payload: claimData });
    dispatch({ type: 'SET_PROCESSING', payload: true });

    // Navigate to processing view
    navigate(`/processing/${claimId}`, {
      state: {
        imagePreviews: imagePreviews,
        incident,
        vehicle,
        claimId: claimId,
      },
    });
  };

  return (
    <div className="page submit-page">
      <div className="container container-sm">
        <div className="page-header" style={{ textAlign: 'center' }}>
          <h1 className="page-title">Submit a Claim</h1>
          <p className="page-subtitle">Upload damage photos and provide incident details for AI-powered assessment</p>
        </div>

        {/* Steps Indicator */}
        <div className="submit-steps">
          {steps.map((s, i) => (
            <div key={i} className="submit-steps-row">
              {i > 0 && <div className={`step-line ${i <= step ? 'completed' : ''}`} />}
              <button
                className={`step ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}
                onClick={() => i < step && setStep(i)}
                type="button"
              >
                <div className="step-number">
                  {i < step ? <CheckCircle size={16} /> : (i + 1)}
                </div>
                <span className="step-label">{s.label}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Form Content */}
        <div className="submit-form glass-strong">
          {/* Step 0: Vehicle */}
          {step === 0 && (
            <div className="form-step" key="vehicle">
              <h3>Vehicle Information</h3>
              <p className="form-step-desc">Tell us about the vehicle involved in the claim.</p>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Make <span>*</span></label>
                  <select className="form-input form-select" value={vehicle.make} onChange={e => setVehicle(v => ({ ...v, make: e.target.value }))} id="vehicle-make">
                    <option value="">Select make...</option>
                    {VEHICLE_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {errors.make && <span className="form-error"><AlertCircle size={12} /> {errors.make}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Model <span>*</span></label>
                  <input className="form-input" placeholder="e.g. Swift, Creta, Nexon" value={vehicle.model} onChange={e => setVehicle(v => ({ ...v, model: e.target.value }))} id="vehicle-model" />
                  {errors.model && <span className="form-error"><AlertCircle size={12} /> {errors.model}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <input type="number" className="form-input" min="2000" max="2027" value={vehicle.year} onChange={e => setVehicle(v => ({ ...v, year: parseInt(e.target.value) }))} id="vehicle-year" />
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Segment</label>
                  <select className="form-input form-select" value={vehicle.segment} onChange={e => setVehicle(v => ({ ...v, segment: e.target.value }))} id="vehicle-segment">
                    {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" placeholder="+91 98765 43210" value={vehicle.phone} onChange={e => setVehicle(v => ({ ...v, phone: e.target.value }))} id="vehicle-phone" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" placeholder="name@example.com" value={vehicle.email} onChange={e => setVehicle(v => ({ ...v, email: e.target.value }))} id="vehicle-email" />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Incident */}
          {step === 1 && (
            <div className="form-step" key="incident">
              <h3>Incident Details</h3>
              <p className="form-step-desc">Describe what happened. This helps our AI validate damage against physics.</p>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Incident Type <span>*</span></label>
                  <select className="form-input form-select" value={incident.type} onChange={e => setIncident(v => ({ ...v, type: e.target.value }))} id="incident-type">
                    <option value="">Select type...</option>
                    {INCIDENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {errors.type && <span className="form-error"><AlertCircle size={12} /> {errors.type}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Date <span>*</span></label>
                  <input type="date" className="form-input" value={incident.date} onChange={e => setIncident(v => ({ ...v, date: e.target.value }))} id="incident-date" />
                  {errors.date && <span className="form-error"><AlertCircle size={12} /> {errors.date}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Time (approximate)</label>
                  <input type="time" className="form-input" value={incident.time} onChange={e => setIncident(v => ({ ...v, time: e.target.value }))} id="incident-time" />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Location</label>
                  <input className="form-input" placeholder="e.g. Mumbai, Western Express Highway near Andheri" value={incident.location} onChange={e => setIncident(v => ({ ...v, location: e.target.value }))} id="incident-location" />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Description <span>*</span></label>
                  <textarea className="form-input form-textarea" placeholder="Describe what happened in detail — speed, direction, other vehicles involved, etc." value={incident.description} onChange={e => setIncident(v => ({ ...v, description: e.target.value }))} id="incident-description" />
                  {errors.description && <span className="form-error"><AlertCircle size={12} /> {errors.description}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Photos */}
          {step === 2 && (
            <div className="form-step" key="photos">
              <h3>Damage Photos</h3>
              <p className="form-step-desc">Upload clear photos of all damage areas. More angles = better assessment.</p>

              <div
                className="upload-zone"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                id="upload-zone"
              >
                <div className="upload-zone-icon">
                  <Upload size={24} />
                </div>
                <div className="upload-zone-text">
                  <strong>Click to upload</strong> or drag and drop
                </div>
                <div className="upload-zone-hint">PNG, JPG, HEIC up to 20MB each · Max 10 images</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </div>

              {errors.images && <span className="form-error" style={{ marginTop: '8px', display: 'flex' }}><AlertCircle size={12} /> {errors.images}</span>}

              {imagePreviews.length > 0 && (
                <div className="image-preview-grid" style={{ marginTop: '20px' }}>
                  {imagePreviews.map((img, i) => (
                    <div className="image-preview-item" key={i}>
                      <img src={img.url} alt={`Damage photo ${i + 1}`} />
                      <button className="remove-btn" onClick={() => removeImage(i)} type="button">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="form-step" key="review">
              <h3>Review & Submit</h3>
              <p className="form-step-desc">Please review all information before submitting for AI analysis.</p>

              <div className="review-sections">
                <div className="review-section glass-subtle">
                  <h5><Car size={16} /> Vehicle</h5>
                  <div className="review-grid">
                    <div><span>Make</span><strong>{vehicle.make}</strong></div>
                    <div><span>Model</span><strong>{vehicle.model}</strong></div>
                    <div><span>Year</span><strong>{vehicle.year}</strong></div>
                    <div><span>Segment</span><strong>{vehicle.segment}</strong></div>
                  </div>
                </div>

                <div className="review-section glass-subtle">
                  <h5><FileText size={16} /> Incident</h5>
                  <div className="review-grid">
                    <div><span>Type</span><strong>{INCIDENT_TYPES.find(t => t.value === incident.type)?.label || incident.type}</strong></div>
                    <div><span>Date</span><strong>{incident.date}</strong></div>
                    <div><span>Time</span><strong>{incident.time || 'N/A'}</strong></div>
                    <div><span>Location</span><strong>{incident.location || 'N/A'}</strong></div>
                  </div>
                  <div className="review-description">
                    <span>Description</span>
                    <p>{incident.description}</p>
                  </div>
                </div>

                <div className="review-section glass-subtle">
                  <h5><Camera size={16} /> Photos ({imagePreviews.length})</h5>
                  <div className="image-preview-grid">
                    {imagePreviews.map((img, i) => (
                      <div className="image-preview-item" key={i}>
                        <img src={img.url} alt={`Damage ${i + 1}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="form-nav">
            {step > 0 && (
              <button className="btn btn-outline" onClick={prevStep} type="button">
                <ChevronLeft size={16} /> Previous
              </button>
            )}
            <div style={{ flex: 1 }} />
            {step < 3 ? (
              <button className="btn btn-primary" onClick={nextStep} type="button" id="next-step-btn">
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitting} type="button" id="submit-claim-btn">
                {submitting ? (
                  <>
                    <div className="spinner spinner-sm" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    Run AI Assessment
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


