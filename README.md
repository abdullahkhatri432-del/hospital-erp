# Meridian — Hospital ERP

An enterprise hospital management dashboard covering patients, doctors, appointments, pharmacy, laboratory, billing and insurance — with a working clinical decision support layer.

Built with Next.js 16 and TypeScript.

---

## Why there is no "AI diagnosis assistant"

The obvious feature for a project like this is an LLM that reads symptoms and suggests a diagnosis. This system deliberately does not do that.

An LLM that outputs diagnoses is unsafe in a clinical context. It hallucinates confidently, cannot be audited, has no regulatory clearance, and creates real liability. In most jurisdictions software that informs diagnosis is a regulated medical device.

So instead of a plausible-sounding diagnosis generator, this implements **real clinical decision support** — deterministic, auditable algorithms already used in hospitals:

### NEWS2 early warning scoring

A full implementation of the **National Early Warning Score 2** (Royal College of Physicians, 2017), the deterioration-detection standard used across the NHS.

Seven physiological parameters are scored against published thresholds:

| Parameter | Scored on |
| --- | --- |
| Respiratory rate | ≤8, 9–11, 12–20, 21–24, ≥25 |
| SpO₂ (Scale 1) | ≤91, 92–93, 94–95, ≥96 |
| Supplemental oxygen | Air or oxygen |
| Systolic BP | ≤90, 91–100, 101–110, 111–219, ≥220 |
| Pulse | ≤40, 41–50, 51–90, 91–110, 111–130, ≥131 |
| Temperature | ≤35.0, 35.1–36.0, 36.1–38.0, 38.1–39.0, ≥39.1 |
| Consciousness (ACVPU) | Alert, or anything else |

It implements the **red flag rule** correctly: any single parameter scoring 3 triggers escalation regardless of the aggregate total. Each risk band maps to the specification's own monitoring frequency and clinical response.

Every score is fully decomposed in the UI, so a clinician can see exactly which parameter contributed what.

### Prescription safety checking

Four independent rule sets run live as a prescription is built:

1. **Allergy cross-reference** — including cross-sensitivity groups, so a recorded penicillin allergy flags amoxicillin
2. **Drug-drug interactions** — checked against both the new prescription and the patient's existing medication
3. **Therapeutic duplication** — same active ingredient prescribed twice
4. **Stock and expiry** — insufficient quantity or an expired batch

Try it: prescribe **Ecosprin** for Lakshmi Iyer (on warfarin) for a critical bleeding-risk alert, or **Amoxil** for Ramesh Bhatt (severe penicillin allergy).

The interaction table is a curated demonstration set. Production would query a licensed database such as First Databank or the BNF — this is stated in the UI rather than hidden.

---

## Modules

| Module | Function |
| --- | --- |
| **Overview** | Deterioration watchlist ranked by NEWS2, operational alerts, revenue |
| **Patients** | Register, full clinical record, observation history with trend |
| **Appointments** | Scheduling across departments with status workflow |
| **Laboratory** | Order lifecycle, results with reference-range flagging |
| **Pharmacy** | Live prescribing safety checks, inventory, batch and expiry tracking |
| **Billing** | Per-line GST, integer-paise arithmetic, balance tracking |
| **Insurance** | Claim submission, settlement rate, partial-approval handling |
| **Medical staff** | Consultants, registration, weekly availability |

---

## Notable implementation details

**Currency is computed in integer paise.** `0.1 + 0.2 !== 0.3` is a genuine problem when the number is someone's hospital bill. All invoice arithmetic converts to minor units, computes, then converts back.

**Reference ranges drive the lab UI.** Analytes are flagged high or low against their own range and positioned visually within it, rather than hard-coding thresholds per test.

**Seed data is constructed to exercise the rules.** One patient is septic and deteriorating across three sets of observations; one is anticoagulated; one drug batch is expired and one is below reorder level. The alerts you see are computed, not scripted.

**Settlement rate excludes unsettled claims.** Averaging over pending claims would understate it — a small correctness detail that matters in a finance view.

---

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. No configuration or database required — the demonstration dataset is bundled.

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |

---

## Architecture

```
src/
├── app/                          # App Router entry
├── components/
│   ├── erp-shell.tsx             # Navigation and module routing
│   ├── modules/
│   │   ├── overview.tsx          # Watchlist and alerts
│   │   ├── patients.tsx          # Register and clinical record
│   │   ├── pharmacy.tsx          # Prescribing and inventory
│   │   └── operations.tsx        # Appointments, lab, billing, insurance, staff
│   └── ui/primitives.tsx         # Badge, Card, Table
├── data/seed.ts                  # Fictional demonstration dataset
├── lib/
│   ├── clinical/
│   │   ├── news2.ts              # NEWS2 scoring
│   │   └── interactions.ts       # Prescription safety rules
│   ├── billing.ts                # Invoice arithmetic
│   └── utils.ts
└── types/
```

---

## Scope and limitations

This is a **demonstration system**, not a deployable clinical product. It does not have:

- Authentication, authorisation or audit logging
- A persistent database — state resets on refresh
- HIPAA, GDPR or NDHM compliance controls
- Encryption at rest, or data-retention policies
- Any regulatory clearance

All patient records are fictional. Names, MRNs, policy numbers and registration numbers are invented.

NEWS2 is a scoring aid for trained clinical staff. It supports clinical judgement and does not replace it — patients can deteriorate with a low score, which is why the red-flag rule exists.

## References

- Royal College of Physicians. *National Early Warning Score (NEWS) 2*. London: RCP, 2017.

---

Built by Abdullah Khatri
