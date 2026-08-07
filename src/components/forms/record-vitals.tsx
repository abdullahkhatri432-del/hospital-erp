"use client";

import * as React from "react";
import { Activity, Check, X } from "lucide-react";

import { calculateNews2, RISK_PRESENTATION } from "@/lib/clinical/news2";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Patient, Vitals } from "@/types";

/**
 * Observation entry form.
 *
 * The NEWS2 score is recalculated on every keystroke and shown live, so the
 * user sees the clinical consequence of the numbers as they type them. That
 * is the behaviour of a real observation chart.
 */

interface Field {
  key: keyof Omit<Vitals, "recordedAt" | "onOxygen" | "consciousness">;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}

const FIELDS: Field[] = [
  { key: "respiratoryRate", label: "Respiratory rate", unit: "/min", min: 4, max: 60, step: 1 },
  { key: "spo2", label: "SpO₂", unit: "%", min: 50, max: 100, step: 1 },
  { key: "temperature", label: "Temperature", unit: "°C", min: 30, max: 43, step: 0.1 },
  { key: "systolic", label: "Systolic BP", unit: "mmHg", min: 50, max: 260, step: 1 },
  { key: "diastolic", label: "Diastolic BP", unit: "mmHg", min: 30, max: 160, step: 1 },
  { key: "heartRate", label: "Pulse", unit: "bpm", min: 20, max: 220, step: 1 },
];

const CONSCIOUSNESS: { value: Vitals["consciousness"]; label: string }[] = [
  { value: "alert", label: "Alert" },
  { value: "confusion", label: "Confusion" },
  { value: "voice", label: "Voice" },
  { value: "pain", label: "Pain" },
  { value: "unresponsive", label: "Unresponsive" },
];

export function RecordVitals({
  patient,
  onClose,
}: {
  patient: Patient;
  onClose: () => void;
}) {
  const { dispatch } = useStore();

  // Seed the form from the last observation — clinicians amend, rarely start blank.
  const previous = patient.vitals[patient.vitals.length - 1];

  const [draft, setDraft] = React.useState<Omit<Vitals, "recordedAt">>({
    respiratoryRate: previous?.respiratoryRate ?? 16,
    spo2: previous?.spo2 ?? 98,
    onOxygen: previous?.onOxygen ?? false,
    temperature: previous?.temperature ?? 36.8,
    systolic: previous?.systolic ?? 120,
    diastolic: previous?.diastolic ?? 78,
    heartRate: previous?.heartRate ?? 76,
    consciousness: previous?.consciousness ?? "alert",
  });

  // Live score — this is the point of the form.
  const preview = React.useMemo(
    () => calculateNews2({ ...draft, recordedAt: new Date().toISOString() }),
    [draft],
  );
  const presentation = RISK_PRESENTATION[preview.risk];

  const previousScore = previous ? calculateNews2(previous) : null;
  const delta = previousScore ? preview.total - previousScore.total : null;

  const setValue = (key: keyof typeof draft, value: number | boolean | string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    dispatch({
      type: "record-vitals",
      patientId: patient.id,
      vitals: { ...draft, recordedAt: new Date().toISOString() },
    });
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Record observations
          </h3>
          <p className="mt-0.5 text-xs text-subtle">
            {patient.firstName} {patient.lastName} · {patient.mrn}
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

      {/* Live score */}
      <div
        className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3"
        style={{
          background: presentation.bg,
          borderColor: `${presentation.color}44`,
        }}
      >
        <div className="flex items-center gap-3">
          <Activity className="size-4" style={{ color: presentation.color }} />
          <div>
            <p className="text-xs font-medium" style={{ color: presentation.color }}>
              NEWS2 {preview.total} · {presentation.label} risk
            </p>
            <p className="text-[11px] text-muted">
              {preview.monitoringFrequency}
              {preview.redFlag && " · single-parameter red flag"}
            </p>
          </div>
        </div>

        {delta !== null && delta !== 0 && (
          <span
            className={cn(
              "clinical-num rounded-lg px-2 py-1 text-xs font-bold",
              delta > 0
                ? "bg-red-500/15 text-red-400"
                : "bg-emerald-500/15 text-emerald-400",
            )}
          >
            {delta > 0 ? "+" : ""}
            {delta} vs last
          </span>
        )}
      </div>

      {/* Numeric fields */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((field) => {
          // Show the points this parameter is currently contributing.
          const component = preview.components.find((c) =>
            c.label.toLowerCase().startsWith(field.label.split(" ")[0].toLowerCase()),
          );

          return (
            <div key={field.key}>
              <label
                htmlFor={field.key}
                className="mb-1 flex items-center justify-between text-[10px] tracking-wider text-subtle uppercase"
              >
                {field.label}
                {component && component.points > 0 && (
                  <span
                    className={cn(
                      "clinical-num rounded px-1 text-[10px] font-bold",
                      component.points === 3
                        ? "bg-red-500/15 text-red-400"
                        : "bg-amber-500/15 text-amber-400",
                    )}
                  >
                    +{component.points}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  id={field.key}
                  type="number"
                  inputMode="decimal"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  required
                  value={draft[field.key]}
                  onChange={(event) =>
                    setValue(field.key, Number(event.target.value))
                  }
                  className="clinical-num w-full rounded-lg border border-white/10 bg-black/25 py-2 pr-10 pl-3 text-sm text-foreground outline-none focus:border-primary/50"
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[10px] text-subtle">
                  {field.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Oxygen + consciousness */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[10px] tracking-wider text-subtle uppercase">
            Supplemental oxygen
          </p>
          <button
            type="button"
            onClick={() => setValue("onOxygen", !draft.onOxygen)}
            aria-pressed={draft.onOxygen}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors",
              draft.onOxygen
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-white/10 bg-black/25 text-muted hover:bg-white/5",
            )}
          >
            {draft.onOxygen ? "On oxygen (+2)" : "Room air"}
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded",
                draft.onOxygen ? "bg-amber-500/30" : "bg-white/8",
              )}
            >
              {draft.onOxygen && <Check className="size-2.5" />}
            </span>
          </button>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] tracking-wider text-subtle uppercase">
            Consciousness (ACVPU)
          </p>
          <select
            value={draft.consciousness}
            onChange={(event) => setValue("consciousness", event.target.value)}
            aria-label="Consciousness level"
            className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
          >
            {CONSCIOUSNESS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
                {option.value !== "alert" ? " (+3)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 border-t border-white/8 pt-4">
        <button
          type="submit"
          className="rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          Save observations
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
