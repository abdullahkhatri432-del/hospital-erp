"use client";

import * as React from "react";

import {
  APPOINTMENTS as SEED_APPOINTMENTS,
  CLAIMS as SEED_CLAIMS,
  DRUGS as SEED_DRUGS,
  INVOICES as SEED_INVOICES,
  LAB_REPORTS as SEED_LABS,
  PATIENTS as SEED_PATIENTS,
  PRESCRIPTIONS as SEED_PRESCRIPTIONS,
} from "@/data/seed";
import type {
  Appointment,
  AppointmentStatus,
  ClaimStatus,
  Drug,
  InsuranceClaim,
  Invoice,
  LabAnalyte,
  LabReport,
  LabStatus,
  Patient,
  PatientStatus,
  Prescription,
  Vitals,
} from "@/types";

/**
 * Application state.
 *
 * A reducer over in-memory arrays rather than a database. This is a
 * demonstration system, so the priority is that mutations are real,
 * validated and observable — not that they survive a server restart.
 *
 * State is mirrored into localStorage with a version key, so a change to the
 * seed shape invalidates stale saves rather than corrupting the UI.
 */

const STORAGE_KEY = "meridian-erp-state";
// Bumped when the State shape changes.
const STORAGE_VERSION = 2;

export interface State {
  patients: Patient[];
  appointments: Appointment[];
  drugs: Drug[];
  prescriptions: Prescription[];
  labs: LabReport[];
  invoices: Invoice[];
  claims: InsuranceClaim[];
}

export type Action =
  /* Clinical */
  | { type: "record-vitals"; patientId: string; vitals: Vitals }
  | {
      type: "set-patient-status";
      patientId: string;
      status: PatientStatus;
      ward: string | null;
      bed: string | null;
    }
  /* Appointments */
  | { type: "book-appointment"; appointment: Appointment }
  | {
      type: "set-appointment-status";
      appointmentId: string;
      status: AppointmentStatus;
    }
  | { type: "reschedule"; appointmentId: string; scheduledAt: string }
  /* Pharmacy */
  | { type: "issue-prescription"; prescription: Prescription }
  | { type: "dispense-prescription"; prescriptionId: string }
  | { type: "restock-drug"; drugId: string; quantity: number }
  /* Laboratory */
  | { type: "order-lab"; report: LabReport }
  | { type: "set-lab-status"; reportId: string; status: LabStatus; technician?: string }
  | { type: "report-lab"; reportId: string; analytes: LabAnalyte[]; technician: string }
  /* Billing */
  | { type: "record-payment"; invoiceId: string; amount: number }
  /* Insurance */
  | { type: "submit-claim"; claim: InsuranceClaim }
  | {
      type: "settle-claim";
      claimId: string;
      status: ClaimStatus;
      approvedAmount: number | null;
      rejectionReason: string | null;
    }
  /* Lifecycle */
  | { type: "restore"; state: State }
  | { type: "reset" };

const initialState: State = {
  patients: SEED_PATIENTS,
  appointments: SEED_APPOINTMENTS,
  drugs: SEED_DRUGS,
  prescriptions: SEED_PRESCRIPTIONS,
  labs: SEED_LABS,
  invoices: SEED_INVOICES,
  claims: SEED_CLAIMS,
};

/** Replace one item in an array, matched by id. */
function patch<T extends { id: string }>(
  items: T[],
  id: string,
  update: (item: T) => T,
): T[] {
  return items.map((item) => (item.id === id ? update(item) : item));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    /* ------------------------------------------------------------------ */
    /*  Clinical                                                          */
    /* ------------------------------------------------------------------ */

    case "record-vitals":
      return {
        ...state,
        patients: patch(state.patients, action.patientId, (patient) => ({
          ...patient,
          // Appended, so NEWS2 always reads the most recent entry.
          vitals: [...patient.vitals, action.vitals],
        })),
      };

    case "set-patient-status":
      return {
        ...state,
        patients: patch(state.patients, action.patientId, (patient) => ({
          ...patient,
          status: action.status,
          ward: action.ward,
          bed: action.bed,
          admittedAt:
            action.status === "admitted" || action.status === "critical"
              ? (patient.admittedAt ?? new Date().toISOString())
              : patient.admittedAt,
        })),
      };

    /* ------------------------------------------------------------------ */
    /*  Appointments                                                      */
    /* ------------------------------------------------------------------ */

    case "book-appointment":
      return { ...state, appointments: [...state.appointments, action.appointment] };

    case "set-appointment-status":
      return {
        ...state,
        appointments: patch(
          state.appointments,
          action.appointmentId,
          (appointment) => ({ ...appointment, status: action.status }),
        ),
      };

    case "reschedule":
      return {
        ...state,
        appointments: patch(
          state.appointments,
          action.appointmentId,
          (appointment) => ({
            ...appointment,
            scheduledAt: action.scheduledAt,
            status: "scheduled",
          }),
        ),
      };

    /* ------------------------------------------------------------------ */
    /*  Pharmacy                                                          */
    /* ------------------------------------------------------------------ */

    case "issue-prescription":
      return {
        ...state,
        prescriptions: [...state.prescriptions, action.prescription],
      };

    case "dispense-prescription": {
      const prescription = state.prescriptions.find(
        (p) => p.id === action.prescriptionId,
      );
      if (!prescription || prescription.dispensed) return state;

      // Dispensing decrements stock — the inventory must actually move.
      const drugs = state.drugs.map((drug) => {
        const item = prescription.items.find((i) => i.drugId === drug.id);
        if (!item) return drug;
        return { ...drug, stock: Math.max(0, drug.stock - item.quantity) };
      });

      return {
        ...state,
        drugs,
        prescriptions: patch(state.prescriptions, action.prescriptionId, (p) => ({
          ...p,
          dispensed: true,
          dispensedAt: new Date().toISOString(),
        })),
      };
    }

    case "restock-drug":
      return {
        ...state,
        drugs: patch(state.drugs, action.drugId, (drug) => ({
          ...drug,
          stock: drug.stock + action.quantity,
        })),
      };

    /* ------------------------------------------------------------------ */
    /*  Laboratory                                                        */
    /* ------------------------------------------------------------------ */

    case "order-lab":
      return { ...state, labs: [...state.labs, action.report] };

    case "set-lab-status":
      return {
        ...state,
        labs: patch(state.labs, action.reportId, (report) => ({
          ...report,
          status: action.status,
          technician: action.technician ?? report.technician,
        })),
      };

    case "report-lab":
      return {
        ...state,
        labs: patch(state.labs, action.reportId, (report) => ({
          ...report,
          status: "reported",
          analytes: action.analytes,
          technician: action.technician,
          reportedAt: new Date().toISOString(),
        })),
      };

    /* ------------------------------------------------------------------ */
    /*  Billing                                                           */
    /* ------------------------------------------------------------------ */

    case "record-payment":
      return {
        ...state,
        invoices: patch(state.invoices, action.invoiceId, (invoice) => ({
          ...invoice,
          amountPaid: invoice.amountPaid + action.amount,
        })),
      };

    /* ------------------------------------------------------------------ */
    /*  Insurance                                                         */
    /* ------------------------------------------------------------------ */

    case "submit-claim":
      return {
        ...state,
        claims: [...state.claims, action.claim],
        invoices: patch(state.invoices, action.claim.invoiceId, (invoice) => ({
          ...invoice,
          claimId: action.claim.id,
        })),
      };

    case "settle-claim":
      return {
        ...state,
        claims: patch(state.claims, action.claimId, (claim) => ({
          ...claim,
          status: action.status,
          approvedAmount: action.approvedAmount,
          rejectionReason: action.rejectionReason,
          settledAt: new Date().toISOString(),
        })),
      };

    /* ------------------------------------------------------------------ */
    /*  Lifecycle                                                         */
    /* ------------------------------------------------------------------ */

    case "restore":
      return action.state;

    case "reset":
      return initialState;

    default:
      return state;
  }
}

interface StoreValue extends State {
  dispatch: React.Dispatch<Action>;
  /** True once localStorage has been read, to avoid a hydration mismatch. */
  hydrated: boolean;
}

const StoreContext = React.createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const [hydrated, setHydrated] = React.useState(false);

  // Restore once on mount. The read is deferred into a timeout so no state
  // is set synchronously inside the effect body, which would cascade renders.
  React.useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (cancelled) return;

      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            version: number;
            state: State;
          };
          if (
            parsed.version === STORAGE_VERSION &&
            Array.isArray(parsed.state?.patients) &&
            Array.isArray(parsed.state?.appointments) &&
            Array.isArray(parsed.state?.invoices)
          ) {
            dispatch({ type: "restore", state: parsed.state });
          }
        }
      } catch {
        // Corrupt or unavailable storage should never break the app.
      }

      setHydrated(true);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  // Persist after every change, once hydration has completed.
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: STORAGE_VERSION, state }),
      );
    } catch {
      // Quota errors are non-fatal.
    }
  }, [state, hydrated]);

  const value = React.useMemo(
    () => ({ ...state, dispatch, hydrated }),
    [state, hydrated],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const context = React.useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within StoreProvider");
  }
  return context;
}

/** Generate an id for newly created records. */
export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
