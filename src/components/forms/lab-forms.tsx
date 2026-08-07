"use client";

import * as React from "react";
import { FlaskConical, X } from "lucide-react";

import { DOCTORS } from "@/data/seed";
import { makeId, useStore } from "@/lib/store";
import { analyteFlag, cn } from "@/lib/utils";
import type { LabAnalyte, LabReport, Patient } from "@/types";

/**
 * Standard test panels with their reference ranges.
 *
 * Defining panels as templates means ordering a test produces the correct
 * analyte structure, and reporting only requires entering values.
 */
const PANELS: Record<string, Omit<LabAnalyte, "value">[]> = {
  "Full Blood Count": [
    { name: "Haemoglobin", unit: "g/dL", refLow: 13.0, refHigh: 17.0 },
    { name: "WBC count", unit: "10⁹/L", refLow: 4.0, refHigh: 11.0 },
    { name: "Platelets", unit: "10⁹/L", refLow: 150, refHigh: 410 },
    { name: "Neutrophils", unit: "%", refLow: 40, refHigh: 75 },
  ],
  "C-Reactive Protein": [
    { name: "CRP", unit: "mg/L", refLow: 0, refHigh: 5 },
  ],
  "Coagulation Profile": [
    { name: "INR", unit: "ratio", refLow: 2.0, refHigh: 3.0 },
    { name: "Prothrombin time", unit: "s", refLow: 11, refHigh: 13.5 },
  ],
  "Serum Electrolytes": [
    { name: "Sodium", unit: "mmol/L", refLow: 135, refHigh: 145 },
    { name: "Potassium", unit: "mmol/L", refLow: 3.5, refHigh: 5.1 },
    { name: "Chloride", unit: "mmol/L", refLow: 98, refHigh: 107 },
  ],
  "Liver Function": [
    { name: "ALT", unit: "U/L", refLow: 7, refHigh: 56 },
    { name: "AST", unit: "U/L", refLow: 10, refHigh: 40 },
    { name: "Bilirubin", unit: "mg/dL", refLow: 0.1, refHigh: 1.2 },
  ],
  "Renal Function": [
    { name: "Creatinine", unit: "mg/dL", refLow: 0.7, refHigh: 1.3 },
    { name: "Urea", unit: "mg/dL", refLow: 15, refHigh: 40 },
    { name: "eGFR", unit: "mL/min", refLow: 90, refHigh: 120 },
  ],
  "Iron Studies": [
    { name: "Ferritin", unit: "ng/mL", refLow: 15, refHigh: 200 },
    { name: "Serum iron", unit: "µg/dL", refLow: 60, refHigh: 170 },
    { name: "TIBC", unit: "µg/dL", refLow: 250, refHigh: 400 },
  ],
};

export const PANEL_NAMES = Object.keys(PANELS);

/** Order a new investigation. */
export function OrderLab({
  patients,
  onClose,
}: {
  patients: Patient[];
  onClose: () => void;
}) {
  const { dispatch } = useStore();
  const [patientId, setPatientId] = React.useState(patients[0]?.id ?? "");
  const [doctorId, setDoctorId] = React.useState(DOCTORS[0].id);
  const [panel, setPanel] = React.useState(PANEL_NAMES[0]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const report: LabReport = {
      id: makeId("L"),
      patientId,
      doctorId,
      panel,
      orderedAt: new Date().toISOString(),
      reportedAt: null,
      status: "ordered",
      analytes: [],
      technician: null,
    };

    dispatch({ type: "order-lab", report });
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-sm font-semibold text-foreground">
          Order investigation
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel"
          className="flex size-7 items-center justify-center rounded-lg border border-white/10 text-muted transition-colors hover:bg-white/8 hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="lab-patient"
            className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
          >
            Patient
          </label>
          <select
            id="lab-patient"
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
          >
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.firstName} {patient.lastName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="lab-doctor"
            className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
          >
            Ordered by
          </label>
          <select
            id="lab-doctor"
            value={doctorId}
            onChange={(event) => setDoctorId(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
          >
            {DOCTORS.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="lab-panel"
            className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
          >
            Panel
          </label>
          <select
            id="lab-panel"
            value={panel}
            onChange={(event) => setPanel(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
          >
            {PANEL_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-subtle">
            {PANELS[panel].length} analyte
            {PANELS[panel].length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-t border-white/8 pt-4">
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          <FlaskConical className="size-3.5" />
          Order test
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

/**
 * Enter results for a collected sample.
 * Values are flagged against reference ranges as they are typed.
 */
export function ReportLab({
  report,
  patientLabel,
  onClose,
}: {
  report: LabReport;
  patientLabel: string;
  onClose: () => void;
}) {
  const { dispatch } = useStore();
  const template = PANELS[report.panel] ?? [];

  const [values, setValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(template.map((analyte) => [analyte.name, ""])),
  );
  const [technician, setTechnician] = React.useState("S. Kadam");

  const complete = template.every(
    (analyte) => values[analyte.name] !== "" && !Number.isNaN(Number(values[analyte.name])),
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!complete) return;

    const analytes: LabAnalyte[] = template.map((analyte) => ({
      ...analyte,
      value: Number(values[analyte.name]),
    }));

    dispatch({
      type: "report-lab",
      reportId: report.id,
      analytes,
      technician,
    });
    onClose();
  };

  if (template.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          No template for {report.panel}
        </h3>
        <p className="text-xs text-subtle">
          This panel has no reference-range template defined, so results cannot
          be entered here.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/10 px-4 py-2 text-xs text-muted hover:bg-white/5"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Enter results — {report.panel}
          </h3>
          <p className="mt-0.5 text-xs text-subtle">{patientLabel}</p>
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

      <div className="space-y-2.5">
        {template.map((analyte) => {
          const raw = values[analyte.name];
          const numeric = Number(raw);
          const hasValue = raw !== "" && !Number.isNaN(numeric);
          const flag = hasValue
            ? analyteFlag(numeric, analyte.refLow, analyte.refHigh)
            : null;

          return (
            <div key={analyte.name} className="flex items-center gap-3">
              <label
                htmlFor={`analyte-${analyte.name}`}
                className="w-40 shrink-0 text-xs text-muted"
              >
                {analyte.name}
              </label>
              <input
                id={`analyte-${analyte.name}`}
                type="number"
                step="0.01"
                value={raw}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    [analyte.name]: event.target.value,
                  }))
                }
                className={cn(
                  "clinical-num w-28 rounded-lg border bg-black/25 px-3 py-1.5 text-sm outline-none",
                  flag === "normal"
                    ? "border-emerald-500/40 text-emerald-300"
                    : flag
                      ? "border-red-500/40 text-red-300"
                      : "border-white/10 text-foreground focus:border-primary/50",
                )}
              />
              <span className="w-14 text-[10px] text-subtle">
                {analyte.unit}
              </span>
              <span className="clinical-num text-[10px] text-subtle">
                ref {analyte.refLow}–{analyte.refHigh}
              </span>
              {flag && flag !== "normal" && (
                <span
                  className={cn(
                    "rounded px-1.5 text-[10px] font-bold",
                    flag === "high"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-amber-500/15 text-amber-400",
                  )}
                >
                  {flag === "high" ? "HIGH" : "LOW"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <label
          htmlFor="lab-tech"
          className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
        >
          Reported by
        </label>
        <input
          id="lab-tech"
          type="text"
          value={technician}
          onChange={(event) => setTechnician(event.target.value)}
          className="w-52 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
        />
      </div>

      <div className="flex gap-2 border-t border-white/8 pt-4">
        <button
          type="submit"
          disabled={!complete}
          className={cn(
            "rounded-lg px-4 py-2 text-xs font-semibold transition-opacity",
            complete
              ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:opacity-90"
              : "cursor-not-allowed bg-white/8 text-subtle",
          )}
        >
          Publish results
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
