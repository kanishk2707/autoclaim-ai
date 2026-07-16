import { createContext, useContext, useReducer, useEffect } from 'react';

const ClaimContext = createContext(null);

const STORAGE_KEY = 'autoclaim_claims';

function loadClaims() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveClaims(claims) {
  try {
    // Strip base64 image data before persisting to avoid hitting localStorage's 5MB quota.
    // The images are already displayed from results.imagePreviews during the session,
    // but we don't need multi-MB base64 strings surviving across reloads.
    const lightweight = claims.map(c => {
      if (!c.imagePreviews && !c.results?.imagePreviews) return c;
      const clone = { ...c };
      // Strip claim-level base64 previews
      if (Array.isArray(clone.imagePreviews)) {
        clone.imagePreviews = clone.imagePreviews.map(p => {
          const url = typeof p === 'string' ? p : p?.url;
          return url && url.startsWith('data:') ? '[base64-stripped]' : url;
        });
      }
      // Strip results-level base64 previews
      if (clone.results && Array.isArray(clone.results.imagePreviews)) {
        clone.results = { ...clone.results };
        clone.results.imagePreviews = clone.results.imagePreviews.map(p => {
          const url = typeof p === 'string' ? p : p?.url;
          return url && url.startsWith('data:') ? '[base64-stripped]' : url;
        });
      }
      return clone;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
  } catch (e) {
    console.warn('Failed to save claims to localStorage:', e.message);
  }
}

const initialState = {
  claims: [],
  currentClaim: null,
  processing: false,
  processingProgress: null,
};

function claimReducer(state, action) {
  switch (action.type) {
    case 'LOAD_CLAIMS':
      return { ...state, claims: action.payload };

    case 'SUBMIT_CLAIM': {
      const newClaim = {
        ...action.payload,
        id: action.payload.id || `CLM-${Date.now()}`,
        status: 'processing',
        submittedAt: new Date().toISOString(),
      };
      const updatedClaims = [newClaim, ...state.claims];
      saveClaims(updatedClaims);
      return { ...state, claims: updatedClaims, currentClaim: newClaim };
    }

    case 'SET_PROCESSING':
      return { ...state, processing: action.payload };

    case 'SET_PROCESSING_PROGRESS':
      return { ...state, processingProgress: action.payload };

    case 'SET_RESULTS': {
      const { claimId, results } = action.payload;
      const updated = state.claims.map(c =>
        c.id === claimId
          ? { ...c, status: results.recommendation === 'auto_approve' ? 'approved' : results.recommendation === 'escalate_siu' ? 'siu' : 'review', results, completedAt: new Date().toISOString() }
          : c
      );
      saveClaims(updated);
      const current = updated.find(c => c.id === claimId);
      return { ...state, claims: updated, currentClaim: current, processing: false };
    }

    case 'SET_ERROR': {
      const { claimId, error } = action.payload;
      const updated = state.claims.map(c =>
        c.id === claimId
          ? { ...c, status: 'error', error }
          : c
      );
      saveClaims(updated);
      return { ...state, claims: updated, processing: false };
    }

    case 'SET_CURRENT_CLAIM':
      return { ...state, currentClaim: action.payload };

    case 'UPDATE_OVERRIDE': {
      const { claimId, field, value } = action.payload;
      const updated = state.claims.map(c => {
        if (c.id === claimId && c.results) {
          const overrides = { ...(c.overrides || {}), [field]: value };
          return { ...c, overrides, lastOverrideAt: new Date().toISOString() };
        }
        return c;
      });
      saveClaims(updated);
      const current = updated.find(c => c.id === claimId);
      return { ...state, claims: updated, currentClaim: current };
    }

    case 'APPROVE_CLAIM': {
      const updated = state.claims.map(c =>
        c.id === action.payload
          ? { ...c, status: 'approved', approvedAt: new Date().toISOString(), approvedBy: 'adjuster' }
          : c
      );
      saveClaims(updated);
      const current = updated.find(c => c.id === action.payload);
      return { ...state, claims: updated, currentClaim: current };
    }

    case 'REJECT_CLAIM': {
      const updated = state.claims.map(c =>
        c.id === action.payload
          ? { ...c, status: 'rejected', rejectedAt: new Date().toISOString(), rejectedBy: 'adjuster' }
          : c
      );
      saveClaims(updated);
      const current = updated.find(c => c.id === action.payload);
      return { ...state, claims: updated, currentClaim: current };
    }

    case 'DELETE_CLAIM': {
      const updated = state.claims.filter(c => c.id !== action.payload);
      saveClaims(updated);
      return { ...state, claims: updated, currentClaim: state.currentClaim?.id === action.payload ? null : state.currentClaim };
    }

    default:
      return state;
  }
}

export function ClaimProvider({ children }) {
  const [state, dispatch] = useReducer(claimReducer, initialState);

  useEffect(() => {
    dispatch({ type: 'LOAD_CLAIMS', payload: loadClaims() });
  }, []);

  return (
    <ClaimContext.Provider value={{ state, dispatch }}>
      {children}
    </ClaimContext.Provider>
  );
}

export function useClaims() {
  const context = useContext(ClaimContext);
  if (!context) throw new Error('useClaims must be used within ClaimProvider');
  return context;
}
