"use client";

import * as React from "react";
import { AlertTriangle, BedDouble, Check, LogOut, X } from "lucide-react";

import { useStore } from "@/lib/store";
import { freeBeds, validateAdmission, WARDS } from "@/lib/wards";
import { cn } from "@/lib/utils";
import type { Patient, PatientStatus } from "@/types";

/**
 * Admit, transfer or discharge a patient.
 *
 * Bed allocation is validated: a bed must belong to the chosen ward, must be
 * free, and ICU beds require the patient to be flagged critical.
 */
export function ManageAdmission({
  patient,
  onClose,
}: {
  patient: Patient;
  onClose: () => void;
}) {
  const { patients, dispatch } = useStore();

  const isInpatient =
    patient.status === "admitted" || patient.status === "critical";

  const [status, setStatus] = React.useState<PatientStatus>(
    isInpatient ? patient.status : "admitted",
  );
  const [ward, setWard] = React.useState(patient.ward ?? WARDS[1].name);
  const [bedChoice, setBedChoice] = React.useState<string | null>(
    patient.bed ?? null,
  );

  const available = React.useMemo(
    () => freeBeds(ward, patients, patient.id),
    [ward, patients, patient.id],
  );

  // Derive the effective bed rather than syncing it in an effect: if the
  // chosen bed is not free in the current ward, fall back to the first free one.
  const bed =
    bedChoice && available.includes(bedChoice)
      ? bedChoice
      : (available[0] ?? "");

  const setBed = setBedChoice;

  const discharging = status === "discharged" || status === "outpatient";

  const issues = React.useMemo(() => {
    if (discharging) return [];
    if (!bed) return [{ message: "No free beds in this ward." }];
    return validateAdmission(
      { ...patient, status },
      ward,
      bed,
      patients,
    );
  }, [discharging, patient, status, ward, bed, patients]);

  const valid = issues.length === 0;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;

    dispatch({
      type: "set-patient-status",
      patientId: patient.id,
      status,
      ward: discharging ? null : ward,
      bed: discharging ? null : bed,
    });
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {isInpatient ? "Manage admission" : "Admit patient"}
          </h3>
          <p className="mt-0.5 text-xs text-subtle">
            {patient.firstName} {patient.lastName} · currently {patient.status}
            {patient.bed && ` in ${patient.bed}`}
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

      <div>
        <p className="mb-1.5 text-[10px] tracking-wider text-subtle uppercase">
          Status
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { value: "admitted", label: "Admitted" },
              { value: "critical", label: "Critical" },
              { value: "discharged", label: "Discharge" },
              { value: "outpatient", label: "Outpatient" },
            ] as { value: PatientStatus; label: string }[]
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-[11px] transition-colors",
                status === option.value
                  ? option.value === "critical"
                    ? "border-red-500/45 bg-red-500/12 text-red-300"
                    : option.value === "discharged"
                      ? "border-emerald-500/45 bg-emerald-500/12 text-emerald-300"
                      : "border-sky-500/45 bg-sky-500/12 text-sky-300"
                  : "border-white/10 text-muted hover:bg-white/5",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!discharging && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="admit-ward"
              className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
            >
              Ward
            </label>
            <select
              id="admit-ward"
              value={ward}
              onChange={(event) => setWard(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
            >
              {WARDS.map((option) => {
                const free = freeBeds(option.name, patients, patient.id).length;
                return (
                  <option key={option.name} value={option.name}>
                    {option.name} — {free} free
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label
              htmlFor="admit-bed"
              className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
            >
              Bed
            </label>
            <select
              id="admit-bed"
              value={bed}
              onChange={(event) => setBed(event.target.value)}
              disabled={available.length === 0}
              className="clinical-num w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 disabled:opacity-50"
            >
              {available.length === 0 ? (
                <option value="">No free beds</option>
              ) : (
                available.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            <AlertTriangle className="size-3.5" />
            Cannot complete
          </p>
          <ul className="mt-1.5 space-y-1">
            {issues.map((issue, index) => (
              <li key={index} className="text-[11px] text-muted">
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {valid && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5">
          <Check className="size-3.5 text-emerald-400" />
          <p className="text-[11px] text-emerald-300">
            {discharging
              ? "Patient will be discharged and the bed released."
              : `${bed} in ${ward} will be assigned.`}
          </p>
        </div>
      )}

      <div className="flex gap-2 border-t border-white/8 pt-4">
        <button
          type="submit"
          disabled={!valid}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-opacity",
            valid
              ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:opacity-90"
              : "cursor-not-allowed bg-white/8 text-subtle",
          )}
        >
          {discharging ? (
            <>
              <LogOut className="size-3.5" />
              Discharge
            </>
          ) : (
            <>
              <BedDouble className="size-3.5" />
              Confirm
            </>
          )}
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
