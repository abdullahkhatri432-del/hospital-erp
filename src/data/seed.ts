import type {
  Appointment,
  Doctor,
  Drug,
  InsuranceClaim,
  Invoice,
  LabReport,
  Patient,
  Prescription,
} from "@/types";

/**
 * Demonstration dataset.
 *
 * All records are fictional. Names, MRNs, policy numbers and registration
 * numbers are invented and do not correspond to real people or institutions.
 *
 * The data is deliberately constructed so that the clinical rules engine has
 * something meaningful to detect:
 *  - P-1042 is septic (NEWS2 high risk) and has a penicillin allergy
 *  - P-1043 is on warfarin, so aspirin triggers a critical interaction
 *  - One drug batch is expired and one is below reorder level
 */

/** Dates are generated relative to now so the demo never looks stale. */
const now = new Date();
const hoursAgo = (h: number) =>
  new Date(now.getTime() - h * 3600_000).toISOString();
const hoursAhead = (h: number) =>
  new Date(now.getTime() + h * 3600_000).toISOString();
const daysAgo = (d: number) =>
  new Date(now.getTime() - d * 86400_000).toISOString();
const daysAhead = (d: number) =>
  new Date(now.getTime() + d * 86400_000).toISOString();

/* -------------------------------------------------------------------------- */
/*  Doctors                                                                   */
/* -------------------------------------------------------------------------- */

export const DOCTORS: Doctor[] = [
  {
    id: "D-01",
    name: "Dr. Meera Raghavan",
    department: "Cardiology",
    specialisation: "Interventional Cardiology",
    registrationNo: "MCI-2011-44821",
    phone: "+91 98250 11001",
    email: "m.raghavan@hospital.example",
    availableDays: [1, 2, 3, 4, 5],
    consultationFee: 900,
    onDuty: true,
  },
  {
    id: "D-02",
    name: "Dr. Anil Deshpande",
    department: "General Medicine",
    specialisation: "Internal Medicine",
    registrationNo: "MCI-2008-31204",
    phone: "+91 98250 11002",
    email: "a.deshpande@hospital.example",
    availableDays: [1, 2, 3, 4, 5, 6],
    consultationFee: 600,
    onDuty: true,
  },
  {
    id: "D-03",
    name: "Dr. Fatima Sheikh",
    department: "Emergency",
    specialisation: "Emergency Medicine",
    registrationNo: "MCI-2014-58930",
    phone: "+91 98250 11003",
    email: "f.sheikh@hospital.example",
    availableDays: [0, 1, 2, 3, 4, 5, 6],
    consultationFee: 750,
    onDuty: true,
  },
  {
    id: "D-04",
    name: "Dr. Rajesh Kulkarni",
    department: "Orthopaedics",
    specialisation: "Joint Replacement",
    registrationNo: "MCI-2009-27716",
    phone: "+91 98250 11004",
    email: "r.kulkarni@hospital.example",
    availableDays: [1, 3, 5],
    consultationFee: 850,
    onDuty: false,
  },
  {
    id: "D-05",
    name: "Dr. Sneha Patil",
    department: "Paediatrics",
    specialisation: "Neonatology",
    registrationNo: "MCI-2016-66104",
    phone: "+91 98250 11005",
    email: "s.patil@hospital.example",
    availableDays: [1, 2, 4, 5],
    consultationFee: 700,
    onDuty: true,
  },
  {
    id: "D-06",
    name: "Dr. Vikram Nair",
    department: "Neurology",
    specialisation: "Stroke Medicine",
    registrationNo: "MCI-2012-49338",
    phone: "+91 98250 11006",
    email: "v.nair@hospital.example",
    availableDays: [2, 3, 4],
    consultationFee: 1100,
    onDuty: false,
  },
];

/* -------------------------------------------------------------------------- */
/*  Patients                                                                  */
/* -------------------------------------------------------------------------- */

export const PATIENTS: Patient[] = [
  {
    id: "P-1042",
    mrn: "MRN-2026-1042",
    firstName: "Ramesh",
    lastName: "Bhatt",
    dateOfBirth: "1958-03-14",
    sex: "male",
    bloodGroup: "B+",
    phone: "+91 99040 22101",
    email: "r.bhatt@example.com",
    address: "12 Kalupur Road, Ahmedabad, Gujarat 380001",
    status: "critical",
    ward: "ICU",
    bed: "ICU-04",
    admittedAt: hoursAgo(19),
    primaryDoctorId: "D-03",
    allergies: [
      {
        substance: "Penicillin",
        reaction: "Anaphylaxis",
        severity: "severe",
      },
    ],
    conditions: ["Type 2 Diabetes", "Hypertension", "Community-acquired pneumonia"],
    currentMedications: ["Metformin 500mg", "Amlodipine 5mg"],
    insuranceId: "INS-STAR-88213",
    vitals: [
      {
        recordedAt: hoursAgo(14),
        respiratoryRate: 22,
        spo2: 94,
        onOxygen: false,
        temperature: 38.4,
        systolic: 118,
        diastolic: 76,
        heartRate: 98,
        consciousness: "alert",
      },
      {
        recordedAt: hoursAgo(7),
        respiratoryRate: 24,
        spo2: 92,
        onOxygen: true,
        temperature: 38.9,
        systolic: 104,
        diastolic: 68,
        heartRate: 112,
        consciousness: "alert",
      },
      {
        // Deteriorating: this trips NEWS2 into the high-risk band.
        recordedAt: hoursAgo(1),
        respiratoryRate: 26,
        spo2: 90,
        onOxygen: true,
        temperature: 39.2,
        systolic: 96,
        diastolic: 60,
        heartRate: 124,
        consciousness: "confusion",
      },
    ],
  },
  {
    id: "P-1043",
    mrn: "MRN-2026-1043",
    firstName: "Lakshmi",
    lastName: "Iyer",
    dateOfBirth: "1969-11-02",
    sex: "female",
    bloodGroup: "O+",
    phone: "+91 99040 22102",
    email: "l.iyer@example.com",
    address: "44 Navrangpura, Ahmedabad, Gujarat 380009",
    status: "admitted",
    ward: "Cardiology",
    bed: "C-12",
    admittedAt: daysAgo(3),
    primaryDoctorId: "D-01",
    allergies: [],
    conditions: ["Atrial fibrillation", "Hyperlipidaemia"],
    // On warfarin — prescribing aspirin will fire a critical interaction.
    currentMedications: ["Warfarin 5mg", "Atorvastatin 20mg"],
    insuranceId: "INS-HDFC-40917",
    vitals: [
      {
        recordedAt: hoursAgo(9),
        respiratoryRate: 17,
        spo2: 97,
        onOxygen: false,
        temperature: 36.8,
        systolic: 132,
        diastolic: 82,
        heartRate: 78,
        consciousness: "alert",
      },
      {
        recordedAt: hoursAgo(2),
        respiratoryRate: 16,
        spo2: 98,
        onOxygen: false,
        temperature: 36.6,
        systolic: 128,
        diastolic: 80,
        heartRate: 74,
        consciousness: "alert",
      },
    ],
  },
  {
    id: "P-1044",
    mrn: "MRN-2026-1044",
    firstName: "Arjun",
    lastName: "Solanki",
    dateOfBirth: "1996-07-21",
    sex: "male",
    bloodGroup: "A+",
    phone: "+91 99040 22103",
    email: "a.solanki@example.com",
    address: "7 Satellite Road, Ahmedabad, Gujarat 380015",
    status: "outpatient",
    ward: null,
    bed: null,
    admittedAt: null,
    primaryDoctorId: "D-04",
    allergies: [
      { substance: "Sulfa drugs", reaction: "Skin rash", severity: "moderate" },
    ],
    conditions: ["Anterior cruciate ligament tear"],
    currentMedications: [],
    insuranceId: null,
    vitals: [
      {
        recordedAt: hoursAgo(4),
        respiratoryRate: 15,
        spo2: 99,
        onOxygen: false,
        temperature: 36.5,
        systolic: 122,
        diastolic: 78,
        heartRate: 68,
        consciousness: "alert",
      },
    ],
  },
  {
    id: "P-1045",
    mrn: "MRN-2026-1045",
    firstName: "Fatima",
    lastName: "Ansari",
    dateOfBirth: "2019-01-30",
    sex: "female",
    bloodGroup: "AB-",
    phone: "+91 99040 22104",
    email: null,
    address: "23 Paldi, Ahmedabad, Gujarat 380007",
    status: "admitted",
    ward: "Paediatrics",
    bed: "P-06",
    admittedAt: daysAgo(1),
    primaryDoctorId: "D-05",
    allergies: [],
    conditions: ["Acute gastroenteritis", "Mild dehydration"],
    currentMedications: ["ORS", "Zinc supplement"],
    insuranceId: "INS-STAR-77512",
    vitals: [
      {
        recordedAt: hoursAgo(11),
        respiratoryRate: 24,
        spo2: 97,
        onOxygen: false,
        temperature: 38.1,
        systolic: 96,
        diastolic: 62,
        heartRate: 118,
        consciousness: "alert",
      },
      {
        recordedAt: hoursAgo(3),
        respiratoryRate: 21,
        spo2: 98,
        onOxygen: false,
        temperature: 37.4,
        systolic: 100,
        diastolic: 64,
        heartRate: 104,
        consciousness: "alert",
      },
    ],
  },
  {
    id: "P-1046",
    mrn: "MRN-2026-1046",
    firstName: "George",
    lastName: "Mathew",
    dateOfBirth: "1981-05-09",
    sex: "male",
    bloodGroup: "O-",
    phone: "+91 99040 22105",
    email: "g.mathew@example.com",
    address: "88 Bopal, Ahmedabad, Gujarat 380058",
    status: "discharged",
    ward: null,
    bed: null,
    admittedAt: daysAgo(9),
    primaryDoctorId: "D-06",
    allergies: [],
    conditions: ["Transient ischaemic attack"],
    currentMedications: ["Clopidogrel 75mg"],
    insuranceId: "INS-ICICI-11204",
    vitals: [
      {
        recordedAt: daysAgo(5),
        respiratoryRate: 16,
        spo2: 98,
        onOxygen: false,
        temperature: 36.7,
        systolic: 138,
        diastolic: 86,
        heartRate: 72,
        consciousness: "alert",
      },
    ],
  },
  {
    id: "P-1047",
    mrn: "MRN-2026-1047",
    firstName: "Priya",
    lastName: "Chauhan",
    dateOfBirth: "1993-09-17",
    sex: "female",
    bloodGroup: "A-",
    phone: "+91 99040 22106",
    email: "p.chauhan@example.com",
    address: "5 Vastrapur, Ahmedabad, Gujarat 380015",
    status: "outpatient",
    ward: null,
    bed: null,
    admittedAt: null,
    primaryDoctorId: "D-02",
    allergies: [
      { substance: "Ibuprofen", reaction: "Gastric bleeding", severity: "severe" },
    ],
    conditions: ["Iron deficiency anaemia"],
    currentMedications: ["Ferrous sulfate 200mg"],
    insuranceId: "INS-HDFC-63018",
    vitals: [
      {
        recordedAt: hoursAgo(6),
        respiratoryRate: 18,
        spo2: 97,
        onOxygen: false,
        temperature: 36.9,
        systolic: 108,
        diastolic: 70,
        heartRate: 88,
        consciousness: "alert",
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Pharmacy                                                                  */
/* -------------------------------------------------------------------------- */

export const DRUGS: Drug[] = [
  {
    id: "RX-001",
    name: "Amoxil 500",
    genericName: "Amoxicillin",
    form: "capsule",
    strength: "500 mg",
    stock: 420,
    reorderLevel: 100,
    unitPrice: 8.5,
    expiryDate: daysAhead(400),
    batchNo: "AMX-2411",
    scheduleH: true,
    manufacturer: "Cipla",
  },
  {
    id: "RX-002",
    name: "Ecosprin 75",
    genericName: "Aspirin",
    form: "tablet",
    strength: "75 mg",
    stock: 1250,
    reorderLevel: 300,
    unitPrice: 1.2,
    expiryDate: daysAhead(520),
    batchNo: "ECO-3120",
    scheduleH: false,
    manufacturer: "USV",
  },
  {
    id: "RX-003",
    name: "Glycomet 500",
    genericName: "Metformin",
    form: "tablet",
    strength: "500 mg",
    stock: 68,
    reorderLevel: 150,
    unitPrice: 2.4,
    expiryDate: daysAhead(300),
    batchNo: "GLY-8842",
    scheduleH: true,
    manufacturer: "USV",
  },
  {
    id: "RX-004",
    name: "Lasix 40",
    genericName: "Furosemide",
    form: "tablet",
    strength: "40 mg",
    stock: 310,
    reorderLevel: 100,
    unitPrice: 3.1,
    expiryDate: daysAhead(210),
    batchNo: "LAS-5517",
    scheduleH: true,
    manufacturer: "Sanofi",
  },
  {
    id: "RX-005",
    name: "Ciplox 500",
    genericName: "Ciprofloxacin",
    form: "tablet",
    strength: "500 mg",
    stock: 195,
    reorderLevel: 80,
    unitPrice: 6.8,
    expiryDate: daysAhead(180),
    batchNo: "CIP-2209",
    scheduleH: true,
    manufacturer: "Cipla",
  },
  {
    id: "RX-006",
    name: "Atorva 20",
    genericName: "Atorvastatin",
    form: "tablet",
    strength: "20 mg",
    stock: 540,
    reorderLevel: 150,
    unitPrice: 4.9,
    expiryDate: daysAhead(610),
    batchNo: "ATV-7731",
    scheduleH: true,
    manufacturer: "Zydus",
  },
  {
    id: "RX-007",
    name: "Crocin 650",
    genericName: "Paracetamol",
    form: "tablet",
    strength: "650 mg",
    stock: 2100,
    reorderLevel: 500,
    unitPrice: 1.8,
    expiryDate: daysAhead(450),
    batchNo: "CRO-9910",
    scheduleH: false,
    manufacturer: "GSK",
  },
  {
    id: "RX-008",
    name: "Brufen 400",
    genericName: "Ibuprofen",
    form: "tablet",
    strength: "400 mg",
    stock: 34,
    reorderLevel: 120,
    unitPrice: 2.2,
    // Deliberately expired to demonstrate the batch-expiry rule.
    expiryDate: daysAgo(24),
    batchNo: "BRU-1188",
    scheduleH: false,
    manufacturer: "Abbott",
  },
  {
    id: "RX-009",
    name: "Warf 5",
    genericName: "Warfarin",
    form: "tablet",
    strength: "5 mg",
    stock: 160,
    reorderLevel: 60,
    unitPrice: 5.4,
    expiryDate: daysAhead(280),
    batchNo: "WRF-4402",
    scheduleH: true,
    manufacturer: "Cipla",
  },
  {
    id: "RX-010",
    name: "Zifi 200",
    genericName: "Cefixime",
    form: "tablet",
    strength: "200 mg",
    stock: 240,
    reorderLevel: 90,
    unitPrice: 12.5,
    expiryDate: daysAhead(340),
    batchNo: "ZIF-6620",
    scheduleH: true,
    manufacturer: "FDC",
  },
  {
    id: "RX-011",
    name: "Tramacip 50",
    genericName: "Tramadol",
    form: "capsule",
    strength: "50 mg",
    stock: 88,
    reorderLevel: 40,
    unitPrice: 7.6,
    expiryDate: daysAhead(260),
    batchNo: "TRM-3308",
    scheduleH: true,
    manufacturer: "Cipla",
  },
  {
    id: "RX-012",
    name: "Serta 50",
    genericName: "Sertraline",
    form: "tablet",
    strength: "50 mg",
    stock: 130,
    reorderLevel: 50,
    unitPrice: 9.2,
    expiryDate: daysAhead(390),
    batchNo: "SER-5540",
    scheduleH: true,
    manufacturer: "Sun Pharma",
  },
];

/* -------------------------------------------------------------------------- */
/*  Appointments                                                              */
/* -------------------------------------------------------------------------- */

export const APPOINTMENTS: Appointment[] = [
  {
    id: "A-5001",
    patientId: "P-1044",
    doctorId: "D-04",
    scheduledAt: hoursAhead(2),
    durationMinutes: 30,
    reason: "Post-operative ACL review",
    status: "scheduled",
    notes: null,
  },
  {
    id: "A-5002",
    patientId: "P-1047",
    doctorId: "D-02",
    scheduledAt: hoursAhead(4),
    durationMinutes: 20,
    reason: "Anaemia follow-up, review ferritin",
    status: "scheduled",
    notes: null,
  },
  {
    id: "A-5003",
    patientId: "P-1043",
    doctorId: "D-01",
    scheduledAt: hoursAgo(1),
    durationMinutes: 30,
    reason: "INR review and rate control assessment",
    status: "in-consultation",
    notes: "Patient reports occasional palpitations.",
  },
  {
    id: "A-5004",
    patientId: "P-1046",
    doctorId: "D-06",
    scheduledAt: daysAhead(2),
    durationMinutes: 40,
    reason: "TIA follow-up, carotid doppler results",
    status: "scheduled",
    notes: null,
  },
  {
    id: "A-5005",
    patientId: "P-1045",
    doctorId: "D-05",
    scheduledAt: hoursAgo(5),
    durationMinutes: 25,
    reason: "Paediatric gastroenteritis review",
    status: "completed",
    notes: "Hydration improving. Continue ORS.",
  },
  {
    id: "A-5006",
    patientId: "P-1042",
    doctorId: "D-03",
    scheduledAt: hoursAgo(19),
    durationMinutes: 45,
    reason: "Emergency admission — fever and breathlessness",
    status: "completed",
    notes: "Admitted to ICU. Sepsis pathway initiated.",
  },
  {
    id: "A-5007",
    patientId: "P-1044",
    doctorId: "D-04",
    scheduledAt: hoursAhead(28),
    durationMinutes: 30,
    reason: "Physiotherapy planning",
    status: "scheduled",
    notes: null,
  },
  {
    id: "A-5008",
    patientId: "P-1047",
    doctorId: "D-02",
    scheduledAt: daysAgo(14),
    durationMinutes: 20,
    reason: "Initial consultation — fatigue",
    status: "no-show",
    notes: null,
  },
];

/* -------------------------------------------------------------------------- */
/*  Prescriptions                                                             */
/* -------------------------------------------------------------------------- */

export const PRESCRIPTIONS: Prescription[] = [
  {
    id: "PR-8001",
    patientId: "P-1042",
    doctorId: "D-03",
    issuedAt: hoursAgo(18),
    items: [
      {
        drugId: "RX-005",
        dosage: "500 mg",
        frequency: "Twice daily",
        durationDays: 7,
        quantity: 14,
        instructions: "After food. Complete the full course.",
      },
      {
        drugId: "RX-007",
        dosage: "650 mg",
        frequency: "Three times daily as needed",
        durationDays: 5,
        quantity: 15,
        instructions: "For fever above 38°C.",
      },
    ],
    dispensed: true,
    dispensedAt: hoursAgo(17),
  },
  {
    id: "PR-8002",
    patientId: "P-1043",
    doctorId: "D-01",
    issuedAt: hoursAgo(1),
    items: [
      {
        drugId: "RX-006",
        dosage: "20 mg",
        frequency: "Once at night",
        durationDays: 30,
        quantity: 30,
        instructions: "Continue existing statin therapy.",
      },
    ],
    dispensed: false,
    dispensedAt: null,
  },
  {
    id: "PR-8003",
    patientId: "P-1045",
    doctorId: "D-05",
    issuedAt: hoursAgo(20),
    items: [
      {
        drugId: "RX-007",
        dosage: "250 mg",
        frequency: "Every 6 hours as needed",
        durationDays: 3,
        quantity: 12,
        instructions: "Paediatric dose by weight. For fever only.",
      },
    ],
    dispensed: true,
    dispensedAt: hoursAgo(19),
  },
];

/* -------------------------------------------------------------------------- */
/*  Laboratory                                                                */
/* -------------------------------------------------------------------------- */

export const LAB_REPORTS: LabReport[] = [
  {
    id: "L-9001",
    patientId: "P-1042",
    doctorId: "D-03",
    panel: "Full Blood Count",
    orderedAt: hoursAgo(18),
    reportedAt: hoursAgo(15),
    status: "reported",
    technician: "S. Kadam",
    analytes: [
      { name: "Haemoglobin", value: 11.2, unit: "g/dL", refLow: 13.0, refHigh: 17.0 },
      { name: "WBC count", value: 18.4, unit: "10⁹/L", refLow: 4.0, refHigh: 11.0 },
      { name: "Platelets", value: 142, unit: "10⁹/L", refLow: 150, refHigh: 410 },
      { name: "Neutrophils", value: 88, unit: "%", refLow: 40, refHigh: 75 },
    ],
  },
  {
    id: "L-9002",
    patientId: "P-1042",
    doctorId: "D-03",
    panel: "C-Reactive Protein",
    orderedAt: hoursAgo(18),
    reportedAt: hoursAgo(14),
    status: "reported",
    technician: "S. Kadam",
    analytes: [
      { name: "CRP", value: 186, unit: "mg/L", refLow: 0, refHigh: 5 },
    ],
  },
  {
    id: "L-9003",
    patientId: "P-1043",
    doctorId: "D-01",
    panel: "Coagulation Profile",
    orderedAt: hoursAgo(8),
    reportedAt: hoursAgo(5),
    status: "reported",
    technician: "M. Joshi",
    analytes: [
      { name: "INR", value: 3.4, unit: "ratio", refLow: 2.0, refHigh: 3.0 },
      { name: "Prothrombin time", value: 34, unit: "s", refLow: 11, refHigh: 13.5 },
    ],
  },
  {
    id: "L-9004",
    patientId: "P-1047",
    doctorId: "D-02",
    panel: "Iron Studies",
    orderedAt: hoursAgo(30),
    reportedAt: hoursAgo(26),
    status: "reported",
    technician: "M. Joshi",
    analytes: [
      { name: "Ferritin", value: 8, unit: "ng/mL", refLow: 15, refHigh: 200 },
      { name: "Serum iron", value: 32, unit: "µg/dL", refLow: 60, refHigh: 170 },
      { name: "TIBC", value: 448, unit: "µg/dL", refLow: 250, refHigh: 400 },
    ],
  },
  {
    id: "L-9005",
    patientId: "P-1042",
    doctorId: "D-03",
    panel: "Arterial Blood Gas",
    orderedAt: hoursAgo(2),
    reportedAt: null,
    status: "processing",
    technician: "S. Kadam",
    analytes: [],
  },
  {
    id: "L-9006",
    patientId: "P-1045",
    doctorId: "D-05",
    panel: "Serum Electrolytes",
    orderedAt: hoursAgo(1),
    reportedAt: null,
    status: "collected",
    technician: null,
    analytes: [],
  },
];

/* -------------------------------------------------------------------------- */
/*  Billing                                                                   */
/* -------------------------------------------------------------------------- */

export const INVOICES: Invoice[] = [
  {
    id: "I-7001",
    invoiceNo: "INV-2026-7001",
    patientId: "P-1042",
    issuedAt: hoursAgo(18),
    dueAt: daysAhead(12),
    amountPaid: 25000,
    status: "part-paid",
    claimId: "CL-3001",
    lines: [
      { description: "Emergency consultation", category: "consultation", quantity: 1, unitPrice: 750, taxRate: 0 },
      { description: "ICU bed charges (1 day)", category: "room", quantity: 1, unitPrice: 12000, taxRate: 0 },
      { description: "Full Blood Count", category: "laboratory", quantity: 1, unitPrice: 450, taxRate: 18 },
      { description: "C-Reactive Protein", category: "laboratory", quantity: 1, unitPrice: 800, taxRate: 18 },
      { description: "Ciprofloxacin 500mg", category: "pharmacy", quantity: 14, unitPrice: 6.8, taxRate: 12 },
      { description: "Oxygen therapy", category: "procedure", quantity: 1, unitPrice: 3500, taxRate: 18 },
    ],
  },
  {
    id: "I-7002",
    invoiceNo: "INV-2026-7002",
    patientId: "P-1043",
    issuedAt: daysAgo(3),
    dueAt: daysAhead(27),
    amountPaid: 0,
    status: "issued",
    claimId: "CL-3002",
    lines: [
      { description: "Cardiology consultation", category: "consultation", quantity: 2, unitPrice: 900, taxRate: 0 },
      { description: "Ward bed charges (3 days)", category: "room", quantity: 3, unitPrice: 4500, taxRate: 0 },
      { description: "Coagulation Profile", category: "laboratory", quantity: 2, unitPrice: 650, taxRate: 18 },
      { description: "Atorvastatin 20mg", category: "pharmacy", quantity: 30, unitPrice: 4.9, taxRate: 12 },
    ],
  },
  {
    id: "I-7003",
    invoiceNo: "INV-2026-7003",
    patientId: "P-1047",
    issuedAt: daysAgo(26),
    dueAt: daysAgo(4),
    amountPaid: 0,
    status: "overdue",
    claimId: null,
    lines: [
      { description: "General Medicine consultation", category: "consultation", quantity: 1, unitPrice: 600, taxRate: 0 },
      { description: "Iron Studies panel", category: "laboratory", quantity: 1, unitPrice: 1200, taxRate: 18 },
    ],
  },
  {
    id: "I-7004",
    invoiceNo: "INV-2026-7004",
    patientId: "P-1045",
    issuedAt: daysAgo(1),
    dueAt: daysAhead(29),
    amountPaid: 8500,
    status: "paid",
    claimId: "CL-3003",
    lines: [
      { description: "Paediatric consultation", category: "consultation", quantity: 1, unitPrice: 700, taxRate: 0 },
      { description: "Ward bed charges (1 day)", category: "room", quantity: 1, unitPrice: 3200, taxRate: 0 },
      { description: "IV fluids and ORS", category: "pharmacy", quantity: 1, unitPrice: 1450, taxRate: 12 },
      { description: "Serum Electrolytes", category: "laboratory", quantity: 1, unitPrice: 550, taxRate: 18 },
      { description: "Nursing care", category: "procedure", quantity: 1, unitPrice: 2100, taxRate: 18 },
    ],
  },
  {
    id: "I-7005",
    invoiceNo: "INV-2026-7005",
    patientId: "P-1046",
    issuedAt: daysAgo(9),
    dueAt: daysAhead(21),
    amountPaid: 47800,
    status: "paid",
    claimId: "CL-3004",
    lines: [
      { description: "Neurology consultation", category: "consultation", quantity: 2, unitPrice: 1100, taxRate: 0 },
      { description: "MRI Brain", category: "procedure", quantity: 1, unitPrice: 18000, taxRate: 18 },
      { description: "Carotid Doppler", category: "procedure", quantity: 1, unitPrice: 6500, taxRate: 18 },
      { description: "Ward bed charges (4 days)", category: "room", quantity: 4, unitPrice: 3800, taxRate: 0 },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Insurance claims                                                          */
/* -------------------------------------------------------------------------- */

export const CLAIMS: InsuranceClaim[] = [
  {
    id: "CL-3001",
    claimNo: "CLM-2026-3001",
    patientId: "P-1042",
    invoiceId: "I-7001",
    provider: "Star Health",
    policyNo: "INS-STAR-88213",
    claimedAmount: 21118,
    approvedAmount: null,
    status: "under-review",
    submittedAt: hoursAgo(16),
    settledAt: null,
    rejectionReason: null,
  },
  {
    id: "CL-3002",
    claimNo: "CLM-2026-3002",
    patientId: "P-1043",
    invoiceId: "I-7002",
    provider: "HDFC ERGO",
    policyNo: "INS-HDFC-40917",
    claimedAmount: 17111,
    approvedAmount: null,
    status: "submitted",
    submittedAt: daysAgo(2),
    settledAt: null,
    rejectionReason: null,
  },
  {
    id: "CL-3003",
    claimNo: "CLM-2026-3003",
    patientId: "P-1045",
    invoiceId: "I-7004",
    provider: "Star Health",
    policyNo: "INS-STAR-77512",
    claimedAmount: 8452,
    approvedAmount: 8452,
    status: "approved",
    submittedAt: daysAgo(1),
    settledAt: hoursAgo(6),
    rejectionReason: null,
  },
  {
    id: "CL-3004",
    claimNo: "CLM-2026-3004",
    patientId: "P-1046",
    invoiceId: "I-7005",
    provider: "ICICI Lombard",
    policyNo: "INS-ICICI-11204",
    claimedAmount: 51730,
    approvedAmount: 43200,
    status: "partially-approved",
    submittedAt: daysAgo(8),
    settledAt: daysAgo(3),
    rejectionReason:
      "Carotid Doppler not covered under the outpatient diagnostic sub-limit.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Lookup helpers                                                            */
/* -------------------------------------------------------------------------- */

export function getPatient(id: string) {
  return PATIENTS.find((p) => p.id === id);
}

export function getDoctor(id: string) {
  return DOCTORS.find((d) => d.id === id);
}

export function getDrug(id: string) {
  return DRUGS.find((d) => d.id === id);
}

export function patientName(id: string): string {
  const patient = getPatient(id);
  return patient ? `${patient.firstName} ${patient.lastName}` : "Unknown";
}

export function doctorName(id: string): string {
  return getDoctor(id)?.name ?? "Unassigned";
}
