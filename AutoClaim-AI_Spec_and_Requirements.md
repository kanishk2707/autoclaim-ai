# AutoClaim AI — Automated Vehicle Damage Assessment & Fraud Detection Platform
### Product Specification & Engineering Requirements Document (v1.0)
**Prepared for:** AI build agent / engineering team execution
**Document type:** Functional + Technical Specification (FRD/TRD combined)

---

## 1. Executive Summary

AutoClaim AI is a computer-vision-driven platform that automates vehicle insurance and warranty claim assessment. It ingests damage photos (and optional video/metadata), detects and classifies vehicle damage, estimates repair cost against a standardized pricing database, validates the claim against physics-based collision logic, screens for fraud, and returns an **explainable recommendation with a confidence score** — replacing or accelerating manual surveyor inspection.

**What makes this build different from a standard "CV + cost lookup" claims tool:**

1. **Tri-Agent Adjudication Core** — three specialized AI agents (Predictor, Contradictor, Arbiter/Reasoner) run per claim instead of a single model, producing a debated, cross-checked verdict rather than one model's raw output.
2. **Physics-Based Damage Validation** — estimates impact speed, direction, and force consistency, and flags when the *visual damage pattern* doesn't match the *claimed incident story*.
3. **Explainable-by-default UI** — every number on screen (severity, cost, confidence) traces back to a visible reason.
4. **Continual Learning Loop** — surveyor corrections are captured as structured feedback and used for scheduled retraining, so accuracy compounds over time instead of staying static.
5. **Unified Fraud + Damage Scoring** — fraud detection isn't a bolt-on rules engine; it consumes the same agent debate and physics validation output as damage assessment.

---

## 2. Objectives

| # | Objective | Success Signal |
|---|---|---|
| O1 | Automate first-pass damage triage from photos | ≥80% of "minor damage" claims settled without a human surveyor visit |
| O2 | Produce explainable, auditable cost estimates | Every line item traceable to a rule/model/price source |
| O3 | Detect fraud without blocking genuine claims | Fraud recall ≥90% at false-positive rate ≤5% (tune per business risk appetite) |
| O4 | Continuously improve from surveyor feedback | Model MAE on cost estimate decreases release-over-release |
| O5 | Give insurers a "why," not just a "what" | 100% of recommendations carry a human-readable reason string |

---

## 3. Scope

### In scope
- Web + mobile-responsive claim intake (customer-facing) and adjuster dashboard (insurer-facing)
- Image-based damage detection, classification, severity scoring
- Standardized repair cost estimation engine
- Physics-based collision consistency validation
- Duplicate image / metadata / anomaly-based fraud detection
- Tri-agent reasoning core with human-in-the-loop override
- Feedback capture and periodic model retraining pipeline
- Explainable dashboard + cost breakdown UI
- Audit log / compliance trail

### Out of scope (v1)
- Real-time telematics/OBD-II integration (flag as future phase)
- Autonomous claim payout (system recommends; human approves above a configurable threshold)
- Non-vehicle asset classes (property, health) — architecture should stay extensible to these later

---

## 4. System Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                  │
│   Customer App (upload photos/video, incident form)                    │
│   Adjuster Dashboard (review, override, approve)                       │
└───────────────────────────────┬────────────────────────────────────────┘
                                 │ REST/GraphQL + signed media upload
┌───────────────────────────────▼────────────────────────────────────────┐
│                      INGESTION & PRE-PROCESSING SERVICE                │
│  - Image validation (blur/lighting/angle check)                        │
│  - EXIF/metadata extraction                                            │
│  - Perceptual hashing (for duplicate detection)                        │
│  - Vehicle make/model/part segmentation pre-pass                       │
└───────────────────────────────┬────────────────────────────────────────┘
                                 │
┌───────────────────────────────▼────────────────────────────────────────┐
│                    TRI-AGENT ADJUDICATION CORE                         │
│                                                                          │
│  ┌───────────────┐   ┌────────────────┐   ┌─────────────────────────┐ │
│  │ AGENT 1        │   │ AGENT 2         │   │ AGENT 3                │ │
│  │ PREDICTOR      │→→ │ CONTRADICTOR /  │→→ │ ARBITER / REASONER     │ │
│  │ (proposes)     │   │ CHALLENGER      │   │ (resolves + explains)  │ │
│  │                │   │ (adversarial    │   │                        │ │
│  │ - damage det.  │   │  review)        │   │ - reconciles conflicts │ │
│  │ - severity     │   │ - questions low │   │ - final severity/cost  │ │
│  │ - cost draft   │   │   confidence    │   │ - confidence score     │ │
│  │                │   │ - checks physics│   │ - generates reason     │ │
│  │                │   │   consistency   │   │   trace (explainable)  │ │
│  │                │   │ - flags fraud   │   │ - fraud/approval verdict│ │
│  │                │   │   signals       │   │                        │ │
│  └───────────────┘   └────────────────┘   └─────────────────────────┘ │
│         ↑                                              │               │
│         └──────────────── disagreement log ─────────────┘              │
└───────────────────────────────┬────────────────────────────────────────┘
                                 │
┌───────────────────────────────▼────────────────────────────────────────┐
│              PHYSICS-BASED VALIDATION ENGINE (support module)          │
│  - Impact speed / direction estimation from deformation geometry       │
│  - Collision consistency check vs. reported incident description      │
└───────────────────────────────┬────────────────────────────────────────┘
                                 │
┌───────────────────────────────▼────────────────────────────────────────┐
│                     FRAUD & ANOMALY DETECTION SERVICE                  │
│  - Duplicate/near-duplicate image detection (perceptual + CNN embed.)  │
│  - Metadata forensics (EXIF tampering, GPS/time mismatch)              │
│  - Historical claim pattern anomaly detection                         │
│  - Physics-inconsistency flag from Contradictor agent                 │
└───────────────────────────────┬────────────────────────────────────────┘
                                 │
┌───────────────────────────────▼────────────────────────────────────────┐
│                  EXPLAINABLE DASHBOARD & COST ENGINE                   │
│  - Region highlight overlay, part/severity/cost/reason/confidence      │
│  - Line-item cost breakdown (parts, labor, paint, tax)                 │
│  - Risk score panel: Damage / Fraud / Complexity / Approval / ETA      │
└───────────────────────────────┬────────────────────────────────────────┘
                                 │
┌───────────────────────────────▼────────────────────────────────────────┐
│                  FEEDBACK & CONTINUAL LEARNING PIPELINE                │
│  - Surveyor correction capture                                         │
│  - Labeled delta store                                                 │
│  - Scheduled retraining + offline eval gate before promotion           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Tri-Agent Adjudication Core — Detailed Spec

This is the centerpiece differentiator. Build it as three distinct model roles rather than one ensemble average — the value is in the **visible disagreement**, not just a blended score.

### 5.1 Agent 1 — Predictor
- **Input:** preprocessed images, vehicle metadata, incident description (free text or structured form)
- **Task:** object detection + segmentation of damaged region(s), damage type classification (scratch / dent / crack / shatter / structural deformation), initial severity score, draft cost estimate from pricing DB lookup
- **Output schema:**
```json
{
  "damage_regions": [
    {"part": "front_bumper", "bbox": [...], "mask": "...", "damage_type": "scratch", "severity": "minor", "confidence": 0.92}
  ],
  "draft_cost_estimate": 2300,
  "currency": "INR"
}
```

### 5.2 Agent 2 — Contradictor / Challenger
- **Purpose:** adversarially stress-test Agent 1's output rather than confirm it. This is the anti-hallucination layer.
- **Checks it must run:**
  - Confidence-threshold challenge: any Predictor confidence < configurable threshold (e.g. 85%) is auto-flagged for re-examination
  - Cross-image consistency: does damage appear in only one photo but not in others of the same area (possible pre-existing damage or staged photo)?
  - Physics consistency (calls Physics Validation Engine — see §6): does deformation pattern match claimed impact direction/speed?
  - Duplicate/reuse check: is this image or a near-duplicate present in prior claims (calls Fraud Service)?
  - Metadata challenge: EXIF timestamp/GPS vs. reported incident time/location mismatch
- **Output schema:**
```json
{
  "challenges": [
    {"type": "physics_inconsistency", "detail": "Deformation implies >40km/h impact; customer reports parking-lot scratch", "severity": "high"},
    {"type": "low_confidence_region", "region_id": "r1", "confidence": 0.61}
  ],
  "fraud_signal_score": 0.18
}
```

### 5.3 Agent 3 — Arbiter / Reasoner
- **Purpose:** reconcile Predictor output against Contradictor's challenges, produce the *final* claim recommendation with an explicit, human-readable reasoning chain.
- **Logic:**
  - If no material challenges → confirm Predictor output, confidence stays high.
  - If challenges raised → re-weigh evidence, may request a targeted re-analysis (e.g., re-run detection on a specific region), and must state which side it sided with and why.
  - Escalates to **human surveyor review** if: confidence remains below threshold after arbitration, fraud_signal_score exceeds threshold, or estimated cost exceeds an auto-approval cap (configurable per insurer policy).
- **Output schema (this is what the dashboard renders):**
```json
{
  "claim_id": "CLM-2026-000482",
  "final_severity": "minor",
  "final_damage_type": "scratch",
  "part": "front_bumper",
  "estimated_cost": 2300,
  "confidence": 0.92,
  "reason": ["Area < 15 cm²", "Paint damage only", "No metal deformation", "Physics check: consistent with low-speed contact"],
  "risk_scores": {
    "damage_score": 0.22,
    "fraud_score": 0.08,
    "repair_complexity": "low",
    "approval_probability": 0.94,
    "time_to_repair_days": 1
  },
  "recommendation": "auto_approve",
  "requires_human_review": false,
  "agent_disagreement_log": [ /* full trace of Predictor vs Contradictor exchange, kept for audit */ ]
}
```

### 5.4 Consensus & Escalation Rules (must be configurable, not hardcoded)
| Condition | Action |
|---|---|
| Agents agree, confidence ≥ threshold, cost ≤ auto-approve cap | Auto-approve |
| Contradictor raises ≥1 high-severity challenge | Force Arbiter re-analysis before any recommendation |
| Fraud signal score ≥ configurable threshold | Route to Special Investigation Unit (SIU) queue, never auto-approve |
| Confidence < threshold after arbitration | Route to human surveyor with pre-filled findings (not a blank slate) |

**Note on "self-training" from the original brief:** true online self-training in production is risky (model drift, feedback poisoning). Implement this instead as the **Continual Learning Pipeline** in §8 — agents don't retrain themselves live; disagreements and human corrections are logged and used in a controlled, evaluated offline retraining cycle. This preserves the spirit of the idea while keeping it auditable and safe for a regulated insurance context.

---

## 6. Physics-Based Damage Validation Engine

- **Inputs:** damage geometry (deformation depth/area from segmentation), part(s) affected, relative position on vehicle, claimed incident description.
- **Outputs:**
  - Estimated impact speed range (e.g., "15–25 km/h")
  - Estimated impact direction (front/rear/side, angle if derivable)
  - Collision consistency verdict: `consistent` / `inconsistent` / `indeterminate`
- **Method:** Rule-based/physics-informed model calibrated against a labeled dataset of known-speed collision damage (crash-test imagery + repair records) — not a black box; the calibration dataset and formulae used should be documented and versioned.
- **Example use:** Customer states "minor parking scratch"; deformation geometry implies structural crumple beyond paint depth → Contradictor flags inconsistency → Arbiter routes to SIU/human review with the specific mismatch stated in plain language.

---

## 7. Fraud & Anomaly Detection

| Technique | What it catches | Notes |
|---|---|---|
| Perceptual hashing + CNN image embedding similarity search | Reused/stock images across different claims or customers | Run at ingestion, before Predictor |
| EXIF/metadata forensics | Edited images, GPS/time mismatch vs. reported incident, screenshot-of-screenshot artifacts | Flag missing/stripped EXIF as elevated risk, not proof of fraud |
| Cross-claim historical pattern analysis | Repeat claimants, unusual claim-frequency clusters, same repair shop overused | Requires claim history store |
| Physics inconsistency (from §6) | Story doesn't match damage physics | Fed from Contradictor agent |
| Agent disagreement magnitude | Cases where Predictor/Contradictor diverge heavily even after arbitration | Novel signal unique to this architecture — log disagreement magnitude as a fraud feature itself |

**Fraud score** is a weighted composite of the above, surfaced on the dashboard as a 0–100 `Fraud Score`, with each contributing signal listed (never a single unexplained number).

---

## 8. Continual Learning / Feedback Loop

```
Customer uploads images
      ↓
Tri-agent core predicts + explains
      ↓
Human surveyor reviews (required for escalated/high-value/low-confidence claims,
optional spot-check for auto-approved ones)
      ↓
Surveyor correction captured as structured diff:
   { field, model_value, corrected_value, corrector_id, timestamp, claim_id }
      ↓
Corrections stored in a versioned "feedback dataset" (separate from raw training data)
      ↓
Scheduled retraining job (e.g., weekly/monthly, not live/instant)
      ↓
Offline evaluation on held-out validation set — must beat current production
model on precision/recall/cost-MAE before promotion
      ↓
Champion/challenger deployment — new model shadow-runs alongside production
before full cutover
      ↓
Future predictions improve; drift dashboard tracks accuracy trend over time
```

This is the **Continual Learning Claim System**. Key engineering requirement: every retrain must be reproducible and reversible (model versioning + rollback).

---

## 9. Explainable Dashboard — UI Requirements

The dashboard is not optional polish — it's a core requirement per the "insurers hate black boxes" principle.

**Per-claim view must show, in this order:**
1. Uploaded image with highlighted damaged region overlay (bounding box/mask)
2. Detected part
3. Severity
4. Estimated repair cost
5. Reason (bulleted, plain language — pulled directly from Arbiter's `reason` array)
6. Confidence (%, with a visual meter, not just a number)
7. Final recommendation (Auto-Approve / Needs Review / Escalate to SIU)

**Risk Score Panel** (generated per claim):
- Damage Score
- Fraud Score
- Repair Complexity
- Approval Probability
- Confidence
- Estimated Time to Repair

**Explainable Cost Breakdown** (include this — it's high-value and low-cost to build, not optional):
Replace a single lump "Repair Cost ₹43,200" with a line-item table:

| Item | Cost (₹) |
|---|---|
| Front bumper repaint | 4,500 |
| Fog lamp replacement | 6,800 |
| Headlight | 12,000 |
| Labor | 8,000 |
| Paint | 5,700 |
| GST | 6,200 |
| **Total** | **43,200** |

Each line item should be traceable to the standardized pricing table entry that produced it (source part code, labor hour rate, tax rule version).

**Adjuster override capability:** every field above must be editable by a human reviewer, and every override must write to the feedback store (§8).

**Audit trail:** every claim page must have a "View full reasoning trace" expandable panel showing the raw Predictor → Contradictor → Arbiter exchange, for regulatory/dispute purposes.

---

## 10. Data Requirements

| Dataset | Purpose | Notes |
|---|---|---|
| Labeled vehicle damage image dataset (part, damage type, severity) | Train Predictor detection/classification | Augment with synthetic damage generation if volume is low |
| Standardized repair pricing database | Cost estimation | Should be region/currency configurable; versioned so historical claims stay reproducible |
| Historical claims with known outcomes (genuine/fraudulent) | Train fraud scoring | Requires careful class-imbalance handling — fraud is rare |
| Crash-test / known-speed collision imagery | Calibrate Physics Validation Engine | Document calibration source per part/vehicle class |
| Surveyor correction feedback dataset | Continual learning | Structured diffs, versioned, PII-scrubbed |

---

## 11. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Latency | End-to-end tri-agent assessment result in ≤15s for a standard 3–6 image claim |
| Scalability | Support burst load (e.g., post-storm/flood claim spikes) via horizontally scalable inference workers |
| Explainability | No numeric output (cost, confidence, score) may be shown without an accompanying reason string |
| Security & Privacy | Encrypt images/PII at rest and in transit; role-based access; comply with applicable data protection law (e.g., India's DPDP Act) for claimant data |
| Auditability | Every recommendation must be reconstructable from stored agent logs, indefinitely or per regulatory retention period |
| Model governance | Versioned models, reproducible training runs, champion/challenger rollout, rollback capability |
| Availability | 99.5%+ uptime target for claim intake and dashboard |
| Bias/fairness monitoring | Track approval/denial and cost-estimate parity across vehicle segments and regions to catch systematic model bias |

---

## 12. Suggested Tech Stack (adjust to team's existing stack)

- **CV/ML models:** PyTorch (segmentation: Mask R-CNN/YOLO-seg variant), fine-tuned on domain damage dataset
- **Agent orchestration:** LLM-based reasoning layer (for Contradictor/Arbiter explanation generation) orchestrated via a workflow framework (e.g., LangGraph or a custom state machine) — CV models handle perception, LLM handles structured reasoning/explanation synthesis over the CV outputs, not raw pixel reasoning
- **Fraud detection:** Gradient-boosted model (XGBoost/LightGBM) on tabular + embedding features; perceptual hashing (pHash) + FAISS/vector DB for duplicate image search
- **Physics engine:** Rule-based/parametric model, calibrated, implemented as an explicit deterministic service (not a black-box net) for auditability
- **Backend:** REST/GraphQL API, microservice-per-stage (ingestion, adjudication core, fraud, dashboard-serving)
- **Data store:** Object storage for images, relational DB for claims/metadata, vector DB for embeddings
- **MLOps:** Experiment tracking + model registry + scheduled retraining pipeline + shadow deployment
- **Frontend:** Responsive web dashboard (adjuster) + mobile-friendly upload flow (customer)

---

## 13. Phased Delivery Plan

| Phase | Deliverable |
|---|---|
| Phase 1 | Ingestion pipeline + Predictor agent (detection/classification/draft cost) + basic dashboard |
| Phase 2 | Contradictor agent + Physics Validation Engine + agent disagreement logging |
| Phase 3 | Arbiter agent + full explainable dashboard + cost breakdown UI + risk score panel |
| Phase 4 | Fraud & anomaly detection service (duplicate detection, metadata forensics, pattern analysis) |
| Phase 5 | Feedback capture + continual learning pipeline + champion/challenger deployment |
| Phase 6 | Hardening: bias monitoring, audit trail, access control, load testing |

---

## 14. Acceptance Criteria (for build agent to self-verify against)

- [ ] A claim submitted with images produces a final recommendation with all fields in §5.3's output schema populated
- [ ] Every displayed score (damage/fraud/confidence/etc.) has a visible, human-readable reason
- [ ] Cost estimate is shown as a line-item breakdown that sums to the total shown
- [ ] Contradictor agent's challenges are visibly logged and viewable in an audit trace, even when the final recommendation overrides them
- [ ] A claim with high fraud signal is routed to SIU queue, not auto-approved, regardless of confidence
- [ ] A surveyor correction is persisted to the feedback store and is retrievable for the next retraining run
- [ ] No model output is used to auto-approve above the configured cost cap without human sign-off
- [ ] All claim reasoning is reconstructable from stored logs after the fact

---

## 15. Open Questions for the Business/Product Owner (agent should ask, not assume)

1. Currency/region for v1 launch (affects pricing DB and physics calibration data source)?
2. Auto-approval cost cap and confidence threshold — what does the insurer's risk policy allow?
3. Which vehicle segments/makes are in scope for v1 (affects training data collection)?
4. Retention period required for audit logs (regulatory-driven)?
5. Is human surveyor review mandatory for all claims above a value threshold, or fully optional above a confidence threshold?

---
*End of specification.*
