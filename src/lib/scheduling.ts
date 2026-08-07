import type { Appointment, Doctor } from "@/types";

/**
 * Appointment scheduling rules.
 *
 * Booking is not a simple insert — a slot is only valid if the doctor works
 * that weekday, is not already booked, and the patient is not double-booked
 * elsewhere. Each rule returns a specific reason so the UI can explain the
 * rejection rather than just disabling the button.
 */

export interface SlotConflict {
  kind: "unavailable-day" | "doctor-busy" | "patient-busy" | "past";
  message: string;
}

/** Statuses that still occupy a slot in the diary. */
const ACTIVE: Appointment["status"][] = [
  "scheduled",
  "checked-in",
  "in-consultation",
];

function overlaps(
  startA: Date,
  minutesA: number,
  startB: Date,
  minutesB: number,
): boolean {
  const endA = startA.getTime() + minutesA * 60_000;
  const endB = startB.getTime() + minutesB * 60_000;
  return startA.getTime() < endB && startB.getTime() < endA;
}

/**
 * Validate a proposed booking.
 * Returns every conflict found, so the user sees all problems at once.
 */
export function findConflicts(
  proposed: {
    doctorId: string;
    patientId: string;
    scheduledAt: string;
    durationMinutes: number;
  },
  doctor: Doctor | undefined,
  appointments: Appointment[],
  /** Excluded when rescheduling an existing appointment. */
  ignoreAppointmentId?: string,
): SlotConflict[] {
  const conflicts: SlotConflict[] = [];
  const start = new Date(proposed.scheduledAt);

  if (Number.isNaN(start.getTime())) {
    return [{ kind: "past", message: "Select a valid date and time." }];
  }

  if (start.getTime() < Date.now()) {
    conflicts.push({
      kind: "past",
      message: "That time is in the past.",
    });
  }

  if (doctor && !doctor.availableDays.includes(start.getDay())) {
    const weekday = start.toLocaleDateString("en-GB", { weekday: "long" });
    conflicts.push({
      kind: "unavailable-day",
      message: `${doctor.name} does not hold clinics on ${weekday}.`,
    });
  }

  for (const appointment of appointments) {
    if (appointment.id === ignoreAppointmentId) continue;
    if (!ACTIVE.includes(appointment.status)) continue;

    const existing = new Date(appointment.scheduledAt);
    if (
      !overlaps(
        start,
        proposed.durationMinutes,
        existing,
        appointment.durationMinutes,
      )
    ) {
      continue;
    }

    if (appointment.doctorId === proposed.doctorId) {
      conflicts.push({
        kind: "doctor-busy",
        message: `The consultant already has an appointment at ${existing.toLocaleTimeString(
          "en-GB",
          { hour: "2-digit", minute: "2-digit" },
        )}.`,
      });
    }

    if (appointment.patientId === proposed.patientId) {
      conflicts.push({
        kind: "patient-busy",
        message: `This patient is already booked at ${existing.toLocaleTimeString(
          "en-GB",
          { hour: "2-digit", minute: "2-digit" },
        )}.`,
      });
    }
  }

  return conflicts;
}

/**
 * Suggest the next few free slots for a doctor.
 * Scans forward in 30-minute steps across working days.
 */
export function suggestSlots(
  doctor: Doctor,
  patientId: string,
  appointments: Appointment[],
  durationMinutes: number,
  count = 4,
): string[] {
  const slots: string[] = [];
  const cursor = new Date();

  // Start from the next half hour.
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() > 30 ? 60 : 30);

  // Search a fortnight ahead at most.
  const limit = new Date(cursor.getTime() + 14 * 86_400_000);

  while (cursor < limit && slots.length < count) {
    const hour = cursor.getHours();
    const withinClinicHours = hour >= 9 && hour < 17;

    if (withinClinicHours && doctor.availableDays.includes(cursor.getDay())) {
      const conflicts = findConflicts(
        {
          doctorId: doctor.id,
          patientId,
          scheduledAt: cursor.toISOString(),
          durationMinutes,
        },
        doctor,
        appointments,
      );

      if (conflicts.length === 0) {
        slots.push(cursor.toISOString());
      }
    }

    cursor.setMinutes(cursor.getMinutes() + 30);
  }

  return slots;
}

/** Format an ISO string for a datetime-local input. */
export function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
