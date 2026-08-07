import type { Patient } from "@/types";

/**
 * Ward and bed management.
 *
 * Bed allocation is constrained: a bed belongs to exactly one ward, holds one
 * patient, and ICU admission is reserved for patients flagged critical. These
 * rules make admission a real operation rather than a status field update.
 */

export interface Ward {
  name: string;
  /** Bed identifiers belonging to this ward. */
  beds: string[];
  /** ICU beds require a critical status. */
  criticalOnly: boolean;
}

export const WARDS: Ward[] = [
  {
    name: "ICU",
    beds: ["ICU-01", "ICU-02", "ICU-03", "ICU-04", "ICU-05", "ICU-06"],
    criticalOnly: true,
  },
  {
    name: "Cardiology",
    beds: ["C-10", "C-11", "C-12", "C-13", "C-14", "C-15", "C-16", "C-17"],
    criticalOnly: false,
  },
  {
    name: "General Medicine",
    beds: ["G-01", "G-02", "G-03", "G-04", "G-05", "G-06", "G-07", "G-08"],
    criticalOnly: false,
  },
  {
    name: "Paediatrics",
    beds: ["P-01", "P-02", "P-03", "P-04", "P-05", "P-06"],
    criticalOnly: false,
  },
  {
    name: "Orthopaedics",
    beds: ["O-01", "O-02", "O-03", "O-04", "O-05"],
    criticalOnly: false,
  },
];

/** Beds currently occupied, mapped to the occupying patient. */
export function occupancyMap(patients: Patient[]): Map<string, Patient> {
  const map = new Map<string, Patient>();
  for (const patient of patients) {
    const inBed =
      (patient.status === "admitted" || patient.status === "critical") &&
      patient.bed;
    if (inBed && patient.bed) map.set(patient.bed, patient);
  }
  return map;
}

/** Free beds in a ward, excluding one patient's current bed. */
export function freeBeds(
  wardName: string,
  patients: Patient[],
  excludePatientId?: string,
): string[] {
  const ward = WARDS.find((w) => w.name === wardName);
  if (!ward) return [];

  const occupied = occupancyMap(patients);

  return ward.beds.filter((bed) => {
    const occupant = occupied.get(bed);
    return !occupant || occupant.id === excludePatientId;
  });
}

/** Per-ward occupancy figures for the dashboard. */
export function wardOccupancy(patients: Patient[]): {
  ward: string;
  occupied: number;
  total: number;
  percent: number;
}[] {
  const occupied = occupancyMap(patients);

  return WARDS.map((ward) => {
    const used = ward.beds.filter((bed) => occupied.has(bed)).length;
    return {
      ward: ward.name,
      occupied: used,
      total: ward.beds.length,
      percent: Math.round((used / ward.beds.length) * 100),
    };
  });
}

export interface AdmissionIssue {
  message: string;
}

/** Validate a proposed admission or ward transfer. */
export function validateAdmission(
  patient: Patient,
  wardName: string,
  bed: string,
  patients: Patient[],
): AdmissionIssue[] {
  const issues: AdmissionIssue[] = [];
  const ward = WARDS.find((w) => w.name === wardName);

  if (!ward) {
    return [{ message: "Unknown ward." }];
  }

  if (!ward.beds.includes(bed)) {
    issues.push({ message: `${bed} does not belong to ${wardName}.` });
  }

  const occupant = occupancyMap(patients).get(bed);
  if (occupant && occupant.id !== patient.id) {
    issues.push({
      message: `${bed} is occupied by ${occupant.firstName} ${occupant.lastName}.`,
    });
  }

  if (ward.criticalOnly && patient.status !== "critical") {
    issues.push({
      message:
        "ICU beds are reserved for patients flagged critical. Change the status to critical to admit here.",
    });
  }

  return issues;
}
