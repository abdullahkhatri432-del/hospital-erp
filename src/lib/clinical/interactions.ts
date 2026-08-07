import type { ClinicalAlert, Drug, Patient, PrescriptionItem } from "@/types";

/**
 * Prescription safety checking.
 *
 * Three independent rule sets run against every prescription:
 *  1. Allergy cross-reference against the patient's recorded allergies
 *  2. Pairwise drug-drug interaction lookup
 *  3. Therapeutic duplication within the same prescription
 *
 * The interaction table below is a small, curated set of well-documented
 * interactions included to demonstrate the mechanism. A production system
 * would query a licensed database such as First Databank, Micromedex or the
 * BNF rather than a hard-coded table — that limitation is stated in the UI.
 */

interface InteractionRule {
  a: string;
  b: string;
  severity: "warning" | "critical";
  effect: string;
  basis: string;
}

/**
 * Interactions keyed by generic name, lower-cased.
 * Every entry here is a documented, clinically recognised interaction.
 */
const INTERACTIONS: InteractionRule[] = [
  {
    a: "warfarin",
    b: "aspirin",
    severity: "critical",
    effect:
      "Markedly increased bleeding risk through combined anticoagulant and antiplatelet action.",
    basis: "Established pharmacodynamic interaction",
  },
  {
    a: "warfarin",
    b: "ciprofloxacin",
    severity: "critical",
    effect:
      "Ciprofloxacin inhibits warfarin metabolism, raising INR and bleeding risk.",
    basis: "CYP1A2/CYP3A4 inhibition",
  },
  {
    a: "metformin",
    b: "furosemide",
    severity: "warning",
    effect:
      "Loop diuretics may raise metformin levels and increase lactic acidosis risk in renal impairment.",
    basis: "Renal clearance competition",
  },
  {
    a: "atorvastatin",
    b: "clarithromycin",
    severity: "critical",
    effect:
      "Strong CYP3A4 inhibition raises statin exposure, increasing rhabdomyolysis risk.",
    basis: "CYP3A4 inhibition",
  },
  {
    a: "lisinopril",
    b: "spironolactone",
    severity: "warning",
    effect:
      "Combined ACE inhibitor and potassium-sparing diuretic can cause hyperkalaemia.",
    basis: "Additive potassium retention",
  },
  {
    a: "ibuprofen",
    b: "lisinopril",
    severity: "warning",
    effect:
      "NSAIDs reduce ACE inhibitor efficacy and may impair renal function when combined.",
    basis: "Prostaglandin-mediated renal effect",
  },
  {
    a: "amoxicillin",
    b: "methotrexate",
    severity: "warning",
    effect:
      "Penicillins reduce methotrexate renal clearance, increasing toxicity risk.",
    basis: "Renal tubular secretion competition",
  },
  {
    a: "tramadol",
    b: "sertraline",
    severity: "critical",
    effect:
      "Combined serotonergic activity raises the risk of serotonin syndrome.",
    basis: "Additive serotonergic effect",
  },
  {
    a: "digoxin",
    b: "furosemide",
    severity: "warning",
    effect:
      "Diuretic-induced hypokalaemia potentiates digoxin toxicity.",
    basis: "Electrolyte-mediated interaction",
  },
];

/**
 * Cross-sensitivity groups. A recorded allergy to one member implies caution
 * with the others.
 */
const CROSS_SENSITIVITY: Record<string, string[]> = {
  penicillin: ["amoxicillin", "ampicillin", "piperacillin", "cloxacillin"],
  sulfa: ["sulfamethoxazole", "sulfasalazine", "furosemide"],
  nsaid: ["ibuprofen", "diclofenac", "naproxen", "aspirin", "ketorolac"],
  cephalosporin: ["cefixime", "ceftriaxone", "cefuroxime"],
};

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

/** Does this drug fall under a group the patient is allergic to? */
function matchesAllergy(genericName: string, allergen: string): boolean {
  const drug = normalise(genericName);
  const allergy = normalise(allergen);

  if (drug.includes(allergy) || allergy.includes(drug)) return true;

  for (const [group, members] of Object.entries(CROSS_SENSITIVITY)) {
    const allergyIsGroup = allergy.includes(group);
    const drugInGroup = members.some((member) => drug.includes(member));
    if (allergyIsGroup && drugInGroup) return true;
  }

  return false;
}

/**
 * Run every safety check for a prescription.
 * Returns alerts sorted with the most severe first.
 */
export function checkPrescription(
  patient: Patient,
  items: PrescriptionItem[],
  drugs: Drug[],
): ClinicalAlert[] {
  const alerts: ClinicalAlert[] = [];
  const byId = new Map(drugs.map((drug) => [drug.id, drug]));

  const prescribed = items
    .map((item) => byId.get(item.drugId))
    .filter((drug): drug is Drug => Boolean(drug));

  /* 1. Allergy cross-reference ------------------------------------------- */
  for (const drug of prescribed) {
    for (const allergy of patient.allergies) {
      if (!matchesAllergy(drug.genericName, allergy.substance)) continue;

      alerts.push({
        id: `allergy-${drug.id}-${allergy.substance}`,
        severity: allergy.severity === "severe" ? "critical" : "warning",
        category: "allergy",
        title: `Allergy conflict: ${drug.name}`,
        detail: `Patient has a recorded ${allergy.severity} allergy to ${allergy.substance} (${allergy.reaction}). ${drug.genericName} may cross-react.`,
        basis: "Patient allergy record + cross-sensitivity group",
      });
    }
  }

  /* 2. Drug-drug interactions -------------------------------------------- */
  // Check the new prescription against itself and against current medication.
  const allActive = [
    ...prescribed.map((drug) => normalise(drug.genericName)),
    ...patient.currentMedications.map(normalise),
  ];

  for (const rule of INTERACTIONS) {
    const hasA = allActive.some((name) => name.includes(rule.a));
    const hasB = allActive.some((name) => name.includes(rule.b));
    if (!hasA || !hasB) continue;

    alerts.push({
      id: `interaction-${rule.a}-${rule.b}`,
      severity: rule.severity,
      category: "interaction",
      title: `Interaction: ${rule.a} + ${rule.b}`,
      detail: rule.effect,
      basis: rule.basis,
    });
  }

  /* 3. Therapeutic duplication ------------------------------------------- */
  const seen = new Map<string, string>();
  for (const drug of prescribed) {
    const generic = normalise(drug.genericName);
    const existing = seen.get(generic);
    if (existing) {
      alerts.push({
        id: `duplicate-${generic}`,
        severity: "warning",
        category: "duplicate",
        title: `Duplicate therapy: ${drug.genericName}`,
        detail: `${existing} and ${drug.name} contain the same active ingredient. Confirm the combined dose is intended.`,
        basis: "Same generic ingredient prescribed twice",
      });
    } else {
      seen.set(generic, drug.name);
    }
  }

  /* 4. Stock availability ------------------------------------------------ */
  for (const item of items) {
    const drug = byId.get(item.drugId);
    if (!drug) continue;

    if (drug.stock < item.quantity) {
      alerts.push({
        id: `stock-${drug.id}`,
        severity: "warning",
        category: "stock",
        title: `Insufficient stock: ${drug.name}`,
        detail: `${item.quantity} units required but only ${drug.stock} in stock. Substitute or reorder before dispensing.`,
        basis: "Pharmacy inventory",
      });
    }

    if (new Date(drug.expiryDate) < new Date()) {
      alerts.push({
        id: `expiry-${drug.id}`,
        severity: "critical",
        category: "stock",
        title: `Expired batch: ${drug.name}`,
        detail: `Batch ${drug.batchNo} expired on ${new Date(drug.expiryDate).toLocaleDateString("en-GB")}. Do not dispense.`,
        basis: "Batch expiry date",
      });
    }
  }

  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}
