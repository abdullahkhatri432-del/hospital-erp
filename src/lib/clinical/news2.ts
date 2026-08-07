import type {
  NewsScore,
  NewsScoreComponent,
  RiskLevel,
  Vitals,
} from "@/types";

/**
 * NEWS2 — National Early Warning Score, version 2.
 *
 * A published, validated deterioration-detection algorithm from the Royal
 * College of Physicians (2017). Every threshold below is taken directly from
 * the official specification — none of it is invented or inferred.
 *
 * This is a scoring aid for trained clinical staff. It does not diagnose,
 * and it does not replace clinical judgement. A patient can deteriorate with
 * a low score, which is why the "red flag" rule exists.
 *
 * Reference:
 * Royal College of Physicians. National Early Warning Score (NEWS) 2:
 * Standardising the assessment of acute-illness severity in the NHS. 2017.
 */

/** Respiratory rate, breaths per minute. */
function scoreRespiratoryRate(rate: number): number {
  if (rate <= 8) return 3;
  if (rate <= 11) return 1;
  if (rate <= 20) return 0;
  if (rate <= 24) return 2;
  return 3;
}

/**
 * SpO2 using Scale 1 (patients without hypercapnic respiratory failure).
 * Scale 2 applies to COPD patients with a target range of 88-92% and is
 * intentionally not applied automatically — it requires a clinical decision.
 */
function scoreSpo2(spo2: number): number {
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
}

/** Supplemental oxygen scores 2 points on air/oxygen. */
function scoreOxygen(onOxygen: boolean): number {
  return onOxygen ? 2 : 0;
}

/** Systolic blood pressure, mmHg. */
function scoreSystolic(systolic: number): number {
  if (systolic <= 90) return 3;
  if (systolic <= 100) return 2;
  if (systolic <= 110) return 1;
  if (systolic <= 219) return 0;
  return 3;
}

/** Pulse, beats per minute. */
function scoreHeartRate(rate: number): number {
  if (rate <= 40) return 3;
  if (rate <= 50) return 1;
  if (rate <= 90) return 0;
  if (rate <= 110) return 1;
  if (rate <= 130) return 2;
  return 3;
}

/** Temperature, degrees Celsius. */
function scoreTemperature(temp: number): number {
  if (temp <= 35.0) return 3;
  if (temp <= 36.0) return 1;
  if (temp <= 38.0) return 0;
  if (temp <= 39.0) return 1;
  return 2;
}

/** ACVPU — anything other than Alert scores 3. */
function scoreConsciousness(level: Vitals["consciousness"]): number {
  return level === "alert" ? 0 : 3;
}

const CONSCIOUSNESS_LABEL: Record<Vitals["consciousness"], string> = {
  alert: "Alert",
  confusion: "New confusion",
  voice: "Responds to voice",
  pain: "Responds to pain",
  unresponsive: "Unresponsive",
};

/**
 * Determine clinical risk.
 *
 * Per the specification, a score of 3 in any *single* parameter warrants
 * escalation even when the aggregate total is low — this is the red flag.
 */
function determineRisk(total: number, redFlag: boolean): RiskLevel {
  if (total >= 7) return "high";
  if (total >= 5) return "medium";
  if (redFlag) return "low-medium";
  if (total >= 1) return "low";
  return "low";
}

const RESPONSE: Record<
  RiskLevel,
  { recommendation: string; frequency: string }
> = {
  low: {
    recommendation:
      "Continue routine ward-based observation. Escalate if the trend worsens.",
    frequency: "Every 12 hours",
  },
  "low-medium": {
    recommendation:
      "Single parameter scoring 3. Registered nurse to review and decide whether escalation is required.",
    frequency: "Every 4-6 hours",
  },
  medium: {
    recommendation:
      "Urgent review by a clinician competent in acute illness. Consider escalation to critical care outreach.",
    frequency: "Every hour",
  },
  high: {
    recommendation:
      "Emergency assessment by a critical care team. Usually requires transfer to a higher level of care.",
    frequency: "Continuous monitoring",
  },
};

/** Compute the full NEWS2 score with a per-parameter breakdown. */
export function calculateNews2(vitals: Vitals): NewsScore {
  const components: NewsScoreComponent[] = [
    {
      label: "Respiratory rate",
      value: `${vitals.respiratoryRate} /min`,
      points: scoreRespiratoryRate(vitals.respiratoryRate),
    },
    {
      label: "SpO₂ (Scale 1)",
      value: `${vitals.spo2}%`,
      points: scoreSpo2(vitals.spo2),
    },
    {
      label: "Supplemental O₂",
      value: vitals.onOxygen ? "Yes" : "Room air",
      points: scoreOxygen(vitals.onOxygen),
    },
    {
      label: "Systolic BP",
      value: `${vitals.systolic} mmHg`,
      points: scoreSystolic(vitals.systolic),
    },
    {
      label: "Pulse",
      value: `${vitals.heartRate} bpm`,
      points: scoreHeartRate(vitals.heartRate),
    },
    {
      label: "Temperature",
      value: `${vitals.temperature.toFixed(1)} °C`,
      points: scoreTemperature(vitals.temperature),
    },
    {
      label: "Consciousness",
      value: CONSCIOUSNESS_LABEL[vitals.consciousness],
      points: scoreConsciousness(vitals.consciousness),
    },
  ];

  const total = components.reduce((sum, item) => sum + item.points, 0);
  const redFlag = components.some((item) => item.points === 3);
  const risk = determineRisk(total, redFlag);

  return {
    total,
    risk,
    redFlag,
    components,
    recommendation: RESPONSE[risk].recommendation,
    monitoringFrequency: RESPONSE[risk].frequency,
  };
}

export const RISK_PRESENTATION: Record<
  RiskLevel,
  { label: string; color: string; bg: string }
> = {
  low: { label: "Low", color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  "low-medium": {
    label: "Low-Medium",
    color: "#FACC15",
    bg: "rgba(250,204,21,0.12)",
  },
  medium: { label: "Medium", color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  high: { label: "High", color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
};
