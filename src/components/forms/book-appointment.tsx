"use client";

import * as React from "react";
import { AlertTriangle, CalendarPlus, Check, X } from "lucide-react";

import { DOCTORS } from "@/data/seed";
import { findConflicts, suggestSlots, toLocalInputValue } from "@/lib/scheduling";
import { makeId, useStore } from "@/lib/store";
import { cn, formatDateTime } from "@/lib/utils";
import type { Appointment } from "@/types";

const DURATIONS = [15, 20, 30, 45, 60];

/**
 * Booking form with live conflict validation.
 *
 * Conflicts are recomputed on every change and the submit button is gated on
 * them, so an invalid appointment cannot be created. Free slots are suggested
 * from the doctor's own availability.
 */
export function BookAppointment({
  patients,
  defaultPatientId,
  onClose,
}: {
  patients: { id: string; firstName: string; lastName: string; mrn: string }[];
  defaultPatientId?: string;
  onClose: () => void;
}) {
  const { appointments, dispatch } = useStore();

  const [patientId, setPatientId] = React.useState(
    defaultPatientId ?? patients[0]?.id ?? "",
  );
  const [doctorId, setDoctorId] = React.useState(DOCTORS[0].id);
  const [durationMinutes, setDuration] = React.useState(30);
  const [reason, setReason] = React.useState("");
  const [scheduledAt, setScheduledAt] = React.useState(() => {
    // Default to the next half hour.
    const next = new Date();
    next.setSeconds(0, 0);
    next.setMinutes(next.getMinutes() > 30 ? 60 : 30);
    return toLocalInputValue(next.toISOString());
  });

  const doctor = DOCTORS.find((d) => d.id === doctorId);

  const conflicts = React.useMemo(() => {
    if (!scheduledAt) return [];
    return findConflicts(
      {
        doctorId,
        patientId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes,
      },
      doctor,
      appointments,
    );
  }, [doctorId, patientId, scheduledAt, durationMinutes, doctor, appointments]);

  const suggestions = React.useMemo(() => {
    if (!doctor || conflicts.length === 0) return [];
    return suggestSlots(doctor, patientId, appointments, durationMinutes);
  }, [doctor, patientId, appointments, durationMinutes, conflicts.length]);

  const canSubmit = conflicts.length === 0 && reason.trim().length > 2;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    const appointment: Appointment = {
      id: makeId("A"),
      patientId,
      doctorId,
      scheduledAt: new Date(scheduledAt).toISOString(),
      durationMinutes,
      reason: reason.trim(),
      status: "scheduled",
      notes: null,
    };

    dispatch({ type: "book-appointment", appointment });
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Book appointment
          </h3>
          <p className="mt-0.5 text-xs text-subtle">
            Validated against consultant availability and existing bookings
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel"
          className="flex size-7 items-center justify-center rounded-lg border border-white/10 text-muted transition-colors hover:bg-white/8 hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="appt-patient"
            className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
          >
            Patient
          </label>
          <select
            id="appt-patient"
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
          >
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.firstName} {patient.lastName} — {patient.mrn}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="appt-doctor"
            className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
          >
            Consultant
          </label>
          <select
            id="appt-doctor"
            value={doctorId}
            onChange={(event) => setDoctorId(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
          >
            {DOCTORS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.department}
              </option>
            ))}
          </select>
          {doctor && (
            <p className="mt-1 text-[10px] text-subtle">
              Clinics on{" "}
              {doctor.availableDays
                .map(
                  (day) =>
                    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day],
                )
                .join(", ")}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="appt-when"
            className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
          >
            Date and time
          </label>
          <input
            id="appt-when"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            required
            className="clinical-num w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
          />
        </div>

        <div>
          <label
            htmlFor="appt-duration"
            className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
          >
            Duration
          </label>
          <select
            id="appt-duration"
            value={durationMinutes}
            onChange={(event) => setDuration(Number(event.target.value))}
            className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
          >
            {DURATIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="appt-reason"
          className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
        >
          Reason for appointment
        </label>
        <input
          id="appt-reason"
          type="text"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Post-operative review"
          required
          className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground placeholder:text-subtle outline-none focus:border-primary/50"
        />
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            <AlertTriangle className="size-3.5" />
            Cannot book this slot
          </p>
          <ul className="mt-2 space-y-1">
            {conflicts.map((conflict, index) => (
              <li key={index} className="text-[11px] text-muted">
                {conflict.message}
              </li>
            ))}
          </ul>

          {suggestions.length > 0 && (
            <div className="mt-3 border-t border-amber-500/20 pt-2.5">
              <p className="mb-1.5 text-[10px] tracking-wider text-amber-300 uppercase">
                Next available
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setScheduledAt(toLocalInputValue(slot))}
                    className="clinical-num rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] text-amber-200 transition-colors hover:bg-amber-500/20"
                  >
                    {formatDateTime(slot)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {conflicts.length === 0 && reason.trim().length > 2 && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5">
          <Check className="size-3.5 text-emerald-400" />
          <p className="text-[11px] text-emerald-300">
            Slot is free. {doctor?.name} is available at this time.
          </p>
        </div>
      )}

      <div className="flex gap-2 border-t border-white/8 pt-4">
        <button
          type="submit"
          disabled={!canSubmit}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-opacity",
            canSubmit
              ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:opacity-90"
              : "cursor-not-allowed bg-white/8 text-subtle",
          )}
        >
          <CalendarPlus className="size-3.5" />
          Confirm booking
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/10 px-4 py-2 text-xs text-muted transition-colors hover:bg-white/5 hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
