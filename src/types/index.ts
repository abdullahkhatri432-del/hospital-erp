/** Hospital ERP domain model. */

export type Sex = "male" | "female" | "other";

export type BloodGroup =
  | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export type PatientStatus = "outpatient" | "admitted" | "discharged" | "critical";

export interface Allergy {
  substance: string;
  reaction: string;
  severity: "mild" | "moderate" | "severe";
}

export interface Vitals {
  recordedAt: string;
  /** Breaths per minute */
  respiratoryRate: number;
  /** Peripheral oxygen saturation, % */
  spo2: number;
  /** True when the patient is on supplemental oxygen */
  onOxygen: boolean;
  /** Degrees Celsius */
  temperature: number;
  /** Systolic blood pressure, mmHg */
  systolic: number;
  diastolic: number;
  /** Beats per minute */
  heartRate: number;
  /** ACVPU scale */
  consciousness: "alert" | "confusion" | "voice" | "pain" | "unresponsive";
}

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: Sex;
  bloodGroup: BloodGroup;
  phone: string;
  email: string | null;
  address: string;
  status: PatientStatus;
  ward: string | null;
  bed: string | null;
  admittedAt: string | null;
  primaryDoctorId: string;
  allergies: Allergy[];
  conditions: string[];
  currentMedications: string[];
  insuranceId: string | null;
  vitals: Vitals[];
}

export type Department =
  | "Emergency"
  | "Cardiology"
  | "Orthopaedics"
  | "Paediatrics"
  | "Neurology"
  | "General Medicine"
  | "Obstetrics"
  | "Radiology"
  | "Pathology";

export interface Doctor {
  id: string;
  name: string;
  department: Department;
  specialisation: string;
  registrationNo: string;
  phone: string;
  email: string;
  /** Days of week available, 0 = Sunday */
  availableDays: number[];
  consultationFee: number;
  onDuty: boolean;
}

export type AppointmentStatus =
  | "scheduled"
  | "checked-in"
  | "in-consultation"
  | "completed"
  | "cancelled"
  | "no-show";

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  /** ISO datetime */
  scheduledAt: string;
  durationMinutes: number;
  reason: string;
  status: AppointmentStatus;
  notes: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Pharmacy                                                                  */
/* -------------------------------------------------------------------------- */

export interface Drug {
  id: string;
  name: string;
  genericName: string;
  form: "tablet" | "capsule" | "syrup" | "injection" | "ointment" | "drops";
  strength: string;
  /** Units in stock */
  stock: number;
  reorderLevel: number;
  unitPrice: number;
  expiryDate: string;
  batchNo: string;
  scheduleH: boolean;
  manufacturer: string;
}

export interface PrescriptionItem {
  drugId: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  instructions: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  issuedAt: string;
  items: PrescriptionItem[];
  dispensed: boolean;
  dispensedAt: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Laboratory                                                                */
/* -------------------------------------------------------------------------- */

export interface LabAnalyte {
  name: string;
  value: number;
  unit: string;
  refLow: number;
  refHigh: number;
}

export type LabStatus = "ordered" | "collected" | "processing" | "reported";

export interface LabReport {
  id: string;
  patientId: string;
  doctorId: string;
  panel: string;
  orderedAt: string;
  reportedAt: string | null;
  status: LabStatus;
  analytes: LabAnalyte[];
  technician: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Billing & insurance                                                       */
/* -------------------------------------------------------------------------- */

export interface InvoiceLine {
  description: string;
  category: "consultation" | "pharmacy" | "laboratory" | "procedure" | "room";
  quantity: number;
  unitPrice: number;
  /** GST rate as a percentage */
  taxRate: number;
}

export type InvoiceStatus = "draft" | "issued" | "part-paid" | "paid" | "overdue";

export interface Invoice {
  id: string;
  invoiceNo: string;
  patientId: string;
  issuedAt: string;
  dueAt: string;
  lines: InvoiceLine[];
  amountPaid: number;
  status: InvoiceStatus;
  claimId: string | null;
}

export type ClaimStatus =
  | "draft"
  | "submitted"
  | "under-review"
  | "approved"
  | "partially-approved"
  | "rejected";

export interface InsuranceClaim {
  id: string;
  claimNo: string;
  patientId: string;
  invoiceId: string;
  provider: string;
  policyNo: string;
  claimedAmount: number;
  approvedAmount: number | null;
  status: ClaimStatus;
  submittedAt: string;
  settledAt: string | null;
  rejectionReason: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Clinical decision support                                                 */
/* -------------------------------------------------------------------------- */

export type RiskLevel = "low" | "low-medium" | "medium" | "high";

export interface NewsScoreComponent {
  label: string;
  value: string;
  points: number;
}

export interface NewsScore {
  total: number;
  risk: RiskLevel;
  /** Any single parameter scoring 3 triggers escalation regardless of total. */
  redFlag: boolean;
  components: NewsScoreComponent[];
  recommendation: string;
  monitoringFrequency: string;
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface ClinicalAlert {
  id: string;
  severity: AlertSeverity;
  category: "allergy" | "interaction" | "duplicate" | "stock" | "vitals";
  title: string;
  detail: string;
  /** Reference for the rule that fired. */
  basis: string;
}

/* -------------------------------------------------------------------------- */
/*  UI                                                                        */
/* -------------------------------------------------------------------------- */

export interface KpiCard {
  label: string;
  value: string;
  delta: string | null;
  trend: "up" | "down" | "flat";
  intent: "default" | "positive" | "warning" | "critical";
}
