"use client";

import * as React from "react";

import {
  APPOINTMENTS as SEED_APPOINTMENTS,
  PATIENTS as SEED_PATIENTS,
} from "@/data/seed";
import type { Appointment, AppointmentStatus, Patient, Vitals } from "@/types";

/**
 * Application state.
 *
 * Deliberately a reducer over in-memory arrays rather than a database. The
 * project is a demonstration, so the priority is that mutations are real and
 * observable, not that they survive a server restart.
 *
 * State is mirrored into localStorage so a refresh does not wipe work, with
 * a version key so changes to the seed shape invalidate stale saves.
 */

const STORAGE_KEY = "meridian-erp-state";
const STORAGE_VERSION = 1;

interface State {
  patients: Patient[];
  appointments: Appointment[];
}

type Action =
  | { type: "record-vitals"; patientId: string; vitals: Vitals }
  | { type: "book-appointment"; appointment: Appointment }
  | {
      type: "set-appointment-status";
      appointmentId: string;
      status: AppointmentStatus;
    }
  | { type: "reschedule"; appointmentId: string; scheduledAt: string }
  | { type: "restore"; state: State }
  | { type: "reset" };

const initialState: State = {
  patients: SEED_PATIENTS,
  appointments: SEED_APPOINTMENTS,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "record-vitals": {
      return {
        ...state,
        patients: state.patients.map((patient) =>
          patient.id === action.patientId
            ? {
                ...patient,
                // Newest observation appended; NEWS2 always reads the last entry.
                vitals: [...patient.vitals, action.vitals],
              }
            : patient,
        ),
      };
    }

    case "book-appointment": {
      return {
        ...state,
        appointments: [...state.appointments, action.appointment],
      };
    }

    case "set-appointment-status": {
      return {
        ...state,
        appointments: state.appointments.map((appointment) =>
          appointment.id === action.appointmentId
            ? { ...appointment, status: action.status }
            : appointment,
        ),
      };
    }

    case "reschedule": {
      return {
        ...state,
        appointments: state.appointments.map((appointment) =>
          appointment.id === action.appointmentId
            ? {
                ...appointment,
                scheduledAt: action.scheduledAt,
                status: "scheduled",
              }
            : appointment,
        ),
      };
    }

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
            Array.isArray(parsed.state?.appointments)
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
