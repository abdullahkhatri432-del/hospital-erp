"use client";

import * as React from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Info,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";

import { doctorName } from "@/data/seed";
import { makeId, useStore } from "@/lib/store";
import { checkPrescription } from "@/lib/clinical/interactions";
import { cn, formatDate } from "@/lib/utils";
import type { PrescriptionItem } from "@/types";
import { Badge, Card, CardHeader, Table, Td } from "@/components/ui/primitives";

const SEVERITY_STYLE = {
  critical: {
    icon: Ban,
    border: "border-red-500/30",
    bg: "bg-red-500/8",
    text: "text-red-400",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-500/30",
    bg: "bg-amber-500/8",
    text: "text-amber-400",
  },
  info: {
    icon: Info,
    border: "border-sky-500/30",
    bg: "bg-sky-500/8",
    text: "text-sky-400",
  },
} as const;

/**
 * Interactive prescribing screen.
 *
 * Selecting a patient and adding drugs runs the full safety rule set live,
 * which is the point of the module — the alerts are computed, not scripted.
 */
function PrescriptionBuilder() {
  const { patients: PATIENTS, drugs: DRUGS, dispatch } = useStore();
  const [patientId, setPatientId] = React.useState(PATIENTS[0].id);
  const [items, setItems] = React.useState<PrescriptionItem[]>([]);

  const patient = PATIENTS.find((p) => p.id === patientId);

  const alerts = React.useMemo(() => {
    if (!patient || items.length === 0) return [];
    return checkPrescription(patient, items, DRUGS);
  }, [patient, items, DRUGS]);

  const addDrug = (drugId: string) => {
    if (items.some((item) => item.drugId === drugId)) return;
    setItems((prev) => [
      ...prev,
      {
        drugId,
        dosage: "As directed",
        frequency: "Twice daily",
        durationDays: 5,
        quantity: 10,
        instructions: "",
      },
    ]);
  };

  const removeDrug = (drugId: string) => {
    setItems((prev) => prev.filter((item) => item.drugId !== drugId));
  };

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;

  /**
   * Issue the prescription.
   *
   * Critical alerts block issuing outright — that is the entire purpose of
   * the safety engine. Warnings are advisory and can be overridden.
   */
  const issue = () => {
    if (items.length === 0 || criticalCount > 0) return;

    dispatch({
      type: "issue-prescription",
      prescription: {
        id: makeId("PR"),
        patientId,
        doctorId: patient?.primaryDoctorId ?? "D-02",
        issuedAt: new Date().toISOString(),
        items,
        dispensed: false,
        dispensedAt: null,
      },
    });
    setItems([]);
  };

  return (
    <Card>
      <CardHeader
        title="Prescribing with safety checks"
        subtitle="Allergy, interaction, duplication and stock rules run on every change"
        action={
          alerts.length > 0 ? (
            <Badge tone={criticalCount > 0 ? "danger" : "warning"} size="md">
              {alerts.length} alert{alerts.length > 1 ? "s" : ""}
            </Badge>
          ) : items.length > 0 ? (
            <Badge tone="success" size="md">
              <CheckCircle2 className="size-3" />
              No conflicts
            </Badge>
          ) : null
        }
      />

      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.2fr]">
        {/* Selection */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="patient-select"
              className="mb-1.5 block text-[10px] tracking-wider text-subtle uppercase"
            >
              Patient
            </label>
            <select
              id="patient-select"
              value={patientId}
              onChange={(event) => {
                setPatientId(event.target.value);
                setItems([]);
              }}
              className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
            >
              {PATIENTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} — {p.mrn}
                </option>
              ))}
            </select>
          </div>

          {patient && (
            <div className="rounded-xl border border-white/8 bg-black/20 p-3 text-[11px]">
              <p className="text-subtle">
                Allergies:{" "}
                <span
                  className={
                    patient.allergies.length > 0
                      ? "text-red-400"
                      : "text-foreground"
                  }
                >
                  {patient.allergies.length > 0
                    ? patient.allergies.map((a) => a.substance).join(", ")
                    : "None recorded"}
                </span>
              </p>
              <p className="mt-1 text-subtle">
                Current meds:{" "}
                <span className="text-foreground">
                  {patient.currentMedications.length > 0
                    ? patient.currentMedications.join(", ")
                    : "None"}
                </span>
              </p>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[10px] tracking-wider text-subtle uppercase">
              Add medication
            </p>
            <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {DRUGS.map((drug) => {
                const added = items.some((item) => item.drugId === drug.id);
                return (
                  <button
                    key={drug.id}
                    type="button"
                    onClick={() => addDrug(drug.id)}
                    disabled={added}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                      added
                        ? "cursor-default border-white/5 bg-white/[0.02] opacity-45"
                        : "border-white/8 hover:border-primary/40 hover:bg-white/5",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-foreground">
                        {drug.name}
                      </span>
                      <span className="block truncate text-[10px] text-subtle">
                        {drug.genericName} · {drug.strength}
                      </span>
                    </span>
                    {!added && <Plus className="size-3 shrink-0 text-subtle" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Prescription + alerts */}
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[10px] tracking-wider text-subtle uppercase">
              Prescription ({items.length})
            </p>
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/12 p-6 text-center">
                <p className="text-xs text-subtle">
                  Add a medication to run the safety checks.
                </p>
                <p className="mt-2 text-[10px] text-subtle">
                  Try Ecosprin for Lakshmi Iyer (on warfarin), or Amoxil for
                  Ramesh Bhatt (penicillin allergy).
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {items.map((item) => {
                  const drug = DRUGS.find((d) => d.id === item.drugId);
                  if (!drug) return null;
                  return (
                    <div
                      key={item.drugId}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-black/20 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs text-foreground">
                          {drug.name}
                        </p>
                        <p className="truncate text-[10px] text-subtle">
                          {item.frequency} · {item.durationDays} days · qty{" "}
                          {item.quantity}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDrug(item.drugId)}
                        aria-label={`Remove ${drug.name}`}
                        className="flex size-6 shrink-0 items-center justify-center rounded text-subtle transition-colors hover:bg-white/8 hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] tracking-wider text-subtle uppercase">
                Safety alerts
              </p>
              {alerts.map((alert) => {
                const style = SEVERITY_STYLE[alert.severity];
                const Icon = style.icon;
                return (
                  <div
                    key={alert.id}
                    className={cn("rounded-xl border p-3", style.border, style.bg)}
                  >
                    <p
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-semibold",
                        style.text,
                      )}
                    >
                      <Icon className="size-3.5 shrink-0" />
                      {alert.title}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                      {alert.detail}
                    </p>
                    <p className="mt-1.5 text-[10px] text-subtle">
                      Rule basis: {alert.basis}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {items.length > 0 && alerts.length === 0 && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="size-3.5" />
                No conflicts detected
              </p>
              <p className="mt-1 text-[11px] text-muted">
                Checks passed against recorded allergies, active medication,
                duplication and stock.
              </p>
            </div>
          )}

          {items.length > 0 && (
            <div className="flex items-center gap-3 border-t border-white/8 pt-4">
              <button
                type="button"
                onClick={issue}
                disabled={criticalCount > 0}
                className={cn(
                  "rounded-lg px-4 py-2 text-xs font-semibold transition-opacity",
                  criticalCount > 0
                    ? "cursor-not-allowed bg-white/8 text-subtle"
                    : "bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:opacity-90",
                )}
              >
                Issue prescription
              </button>
              {criticalCount > 0 && (
                <p className="text-[10px] text-red-400">
                  Blocked: resolve {criticalCount} critical alert
                  {criticalCount > 1 ? "s" : ""} first.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="border-t border-white/8 px-5 py-3 text-[10px] leading-relaxed text-subtle">
        The interaction table is a curated demonstration set. A production
        deployment would query a licensed database such as First Databank or
        the BNF, and every alert would still require pharmacist review.
      </p>
    </Card>
  );
}

/** Inventory table with stock and expiry status. */
function Inventory() {
  const { drugs: DRUGS, dispatch } = useStore();
  return (
    <Card>
      <CardHeader
        title="Pharmacy inventory"
        subtitle={`${DRUGS.length} formulary items`}
      />
      <Table
        headers={["Drug", "Form", "Stock", "Unit price", "Expiry", "Batch", "Status", ""]}
      >
        {DRUGS.map((drug) => {
          const expired = new Date(drug.expiryDate) < new Date();
          const low = drug.stock < drug.reorderLevel;

          return (
            <tr key={drug.id} className="panel-hover">
              <Td>
                <p className="font-medium text-foreground">{drug.name}</p>
                <p className="text-[11px] text-subtle">
                  {drug.genericName} · {drug.strength}
                </p>
              </Td>
              <Td className="text-xs text-muted capitalize">{drug.form}</Td>
              <Td>
                <span
                  className={cn(
                    "clinical-num text-xs",
                    low ? "text-amber-400" : "text-foreground",
                  )}
                >
                  {drug.stock}
                </span>
                <span className="clinical-num ml-1 text-[10px] text-subtle">
                  / {drug.reorderLevel}
                </span>
              </Td>
              <Td className="clinical-num text-xs text-muted">
                ₹{drug.unitPrice.toFixed(2)}
              </Td>
              <Td
                className={cn(
                  "clinical-num text-xs",
                  expired ? "text-red-400" : "text-muted",
                )}
              >
                {formatDate(drug.expiryDate)}
              </Td>
              <Td className="clinical-num text-[11px] text-subtle">
                {drug.batchNo}
              </Td>
              <Td>
                {expired ? (
                  <Badge tone="danger">expired</Badge>
                ) : low ? (
                  <Badge tone="warning">reorder</Badge>
                ) : (
                  <Badge tone="success">in stock</Badge>
                )}
                {drug.scheduleH && (
                  <Badge tone="neutral" className="ml-1">
                    Sch. H
                  </Badge>
                )}
              </Td>
              <Td>
                <button
                  type="button"
                  onClick={() =>
                    dispatch({ type: "restock-drug", drugId: drug.id, quantity: 100 })
                  }
                  className="rounded border border-white/12 px-2 py-1 text-[10px] text-muted transition-colors hover:border-sky-500/40 hover:text-sky-300"
                >
                  +100
                </button>
              </Td>
            </tr>
          );
        })}
      </Table>
    </Card>
  );
}

export function Dispensing() {
  const { prescriptions, patients, drugs, dispatch } = useStore();
  const pending = prescriptions.filter((p) => !p.dispensed);

  return (
    <Card>
      <CardHeader
        title="Dispensing queue"
        subtitle="Dispensing decrements pharmacy stock"
        action={
          <Badge tone={pending.length > 0 ? "warning" : "success"} size="md">
            {pending.length} awaiting
          </Badge>
        }
      />
      {prescriptions.length === 0 ? (
        <div className="px-5 py-10 text-center text-xs text-subtle">
          No prescriptions issued.
        </div>
      ) : (
        <Table headers={["Prescription", "Patient", "Prescriber", "Items", "Status", ""]}>
          {[...prescriptions]
            .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
            .map((prescription) => {
              const patient = patients.find((p) => p.id === prescription.patientId);
              const names = prescription.items
                .map((item) => drugs.find((d) => d.id === item.drugId)?.name)
                .filter(Boolean)
                .join(", ");

              return (
                <tr key={prescription.id} className="panel-hover">
                  <Td className="clinical-num text-xs font-medium text-foreground">
                    {prescription.id}
                  </Td>
                  <Td className="text-xs text-muted">
                    {patient ? `${patient.firstName} ${patient.lastName}` : "Unknown"}
                  </Td>
                  <Td className="text-xs text-muted">
                    {doctorName(prescription.doctorId)}
                  </Td>
                  <Td className="max-w-xs text-xs text-muted">{names}</Td>
                  <Td>
                    <Badge tone={prescription.dispensed ? "success" : "warning"}>
                      {prescription.dispensed ? "dispensed" : "pending"}
                    </Badge>
                  </Td>
                  <Td>
                    {prescription.dispensed ? (
                      <span className="text-[10px] text-subtle">complete</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: "dispense-prescription",
                            prescriptionId: prescription.id,
                          })
                        }
                        className="rounded border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 transition-colors hover:bg-emerald-500/20"
                      >
                        Dispense
                      </button>
                    )}
                  </Td>
                </tr>
              );
            })}
        </Table>
      )}
    </Card>
  );
}

export function Pharmacy() {
  return (
    <div className="space-y-5">
      <PrescriptionBuilder />
      <Dispensing />
      <Inventory />
    </div>
  );
}
