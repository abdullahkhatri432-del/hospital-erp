"use client";

import * as React from "react";
import {
  Activity,
  ChevronRight,
  Pill,
  Plus,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";

import { LAB_REPORTS, doctorName } from "@/data/seed";
import { useStore } from "@/lib/store";
import { RecordVitals } from "@/components/forms/record-vitals";
import { calculateNews2, RISK_PRESENTATION } from "@/lib/clinical/news2";
import { analyteFlag, calculateAge, cn, formatDate, relativeTime } from "@/lib/utils";
import type { Patient } from "@/types";
import { Badge, Card, CardHeader, EmptyState, Table, Td } from "@/components/ui/primitives";

const STATUS_TONE = {
  critical: "danger",
  admitted: "primary",
  outpatient: "neutral",
  discharged: "success",
} as const;

/** Vitals trend as a compact sparkline of NEWS2 totals over time. */
function NewsTrend({ patient }: { patient: Patient }) {
  const scores = patient.vitals.map((v) => calculateNews2(v).total);
  if (scores.length < 2) return null;

  const max = Math.max(...scores, 7);

  return (
    <div className="flex items-end gap-1" aria-label="NEWS2 trend">
      {scores.map((score, index) => {
        const risk = score >= 7 ? "high" : score >= 5 ? "medium" : "low";
        return (
          <div
            key={index}
            className="w-2 rounded-sm"
            style={{
              height: `${Math.max(10, (score / max) * 32)}px`,
              background: RISK_PRESENTATION[risk].color,
              opacity: index === scores.length - 1 ? 1 : 0.45,
            }}
            title={`Score ${score}`}
          />
        );
      })}
    </div>
  );
}

/** Full clinical record for one patient. */
function PatientRecord({
  patient,
  onClose,
}: {
  patient: Patient;
  onClose: () => void;
}) {
  const latest = patient.vitals[patient.vitals.length - 1];
  const score = latest ? calculateNews2(latest) : null;
  const presentation = score ? RISK_PRESENTATION[score.risk] : null;
  const labs = LAB_REPORTS.filter((r) => r.patientId === patient.id);
  const [recording, setRecording] = React.useState(false);

  return (
    <div className="space-y-5">
      {recording && (
        <Card className="p-5">
          <RecordVitals patient={patient} onClose={() => setRecording(false)} />
        </Card>
      )}

      {/* Header */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-foreground">
                {patient.firstName} {patient.lastName}
              </h2>
              <Badge tone={STATUS_TONE[patient.status]}>{patient.status}</Badge>
            </div>
            <p className="clinical-num mt-1 text-xs text-subtle">
              {patient.mrn} · {calculateAge(patient.dateOfBirth)}y {patient.sex} ·{" "}
              {patient.bloodGroup}
            </p>
            <p className="mt-1 text-xs text-muted">
              Under {doctorName(patient.primaryDoctorId)}
              {patient.ward && ` · ${patient.ward} ${patient.bed ?? ""}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close record"
            className="flex size-8 items-center justify-center rounded-lg border border-white/10 text-muted transition-colors hover:bg-white/8 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Allergies are the single most safety-critical field. */}
        {patient.allergies.length > 0 && (
          <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/8 p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-red-300 uppercase">
              <ShieldAlert className="size-3" />
              Allergies
            </p>
            <div className="mt-2 space-y-1">
              {patient.allergies.map((allergy) => (
                <p key={allergy.substance} className="text-xs text-foreground">
                  <span className="font-medium">{allergy.substance}</span>
                  <span className="text-muted">
                    {" "}
                    — {allergy.reaction} ({allergy.severity})
                  </span>
                </p>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* NEWS2 */}
      {score && presentation && (
        <Card>
          <CardHeader
            title="NEWS2 assessment"
            subtitle={`Latest observations ${relativeTime(latest.recordedAt)}`}
            action={
              <div className="flex items-center gap-4">
                {!recording && (
                  <button
                    type="button"
                    onClick={() => setRecording(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-1.5 text-[11px] font-medium text-sky-300 transition-colors hover:bg-sky-500/20"
                  >
                    <Plus className="size-3" />
                    Record observations
                  </button>
                )}
                <div className="text-right">
                  <p
                    className="clinical-num text-2xl font-bold"
                    style={{ color: presentation.color }}
                  >
                    {score.total}
                  </p>
                  <p
                    className="text-[10px] font-medium"
                    style={{ color: presentation.color }}
                  >
                    {presentation.label} risk
                  </p>
                </div>
              </div>
            }
          />

          <div className="grid gap-px bg-white/6 sm:grid-cols-2 lg:grid-cols-4">
            {score.components.map((component) => (
              <div key={component.label} className="bg-surface p-3">
                <p className="text-[10px] text-subtle">{component.label}</p>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="clinical-num text-sm text-foreground">
                    {component.value}
                  </span>
                  <span
                    className={cn(
                      "clinical-num rounded px-1.5 text-[11px] font-bold",
                      component.points === 0
                        ? "text-subtle"
                        : component.points === 3
                          ? "bg-red-500/15 text-red-400"
                          : "bg-amber-500/15 text-amber-400",
                    )}
                  >
                    +{component.points}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            className="border-t border-white/8 px-5 py-4"
            style={{ background: presentation.bg }}
          >
            <p className="text-xs font-medium" style={{ color: presentation.color }}>
              {score.recommendation}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Monitoring frequency: {score.monitoringFrequency}
              {score.redFlag &&
                " · A single parameter scored 3, which warrants review regardless of the aggregate."}
            </p>
          </div>
        </Card>
      )}

      {/* Observations history */}
      {patient.vitals.length > 1 && (
        <Card>
          <CardHeader
            title="Observation history"
            action={<NewsTrend patient={patient} />}
          />
          <Table headers={["Time", "RR", "SpO₂", "Temp", "BP", "HR", "ACVPU", "Score"]}>
            {[...patient.vitals].reverse().map((vitals) => {
              const rowScore = calculateNews2(vitals);
              return (
                <tr key={vitals.recordedAt}>
                  <Td className="text-[11px] text-subtle">
                    {relativeTime(vitals.recordedAt)}
                  </Td>
                  <Td className="clinical-num text-xs">{vitals.respiratoryRate}</Td>
                  <Td className="clinical-num text-xs">
                    {vitals.spo2}%{vitals.onOxygen && " O₂"}
                  </Td>
                  <Td className="clinical-num text-xs">{vitals.temperature}</Td>
                  <Td className="clinical-num text-xs">
                    {vitals.systolic}/{vitals.diastolic}
                  </Td>
                  <Td className="clinical-num text-xs">{vitals.heartRate}</Td>
                  <Td className="text-xs capitalize">{vitals.consciousness}</Td>
                  <Td>
                    <span
                      className="clinical-num text-xs font-bold"
                      style={{ color: RISK_PRESENTATION[rowScore.risk].color }}
                    >
                      {rowScore.total}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </Table>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* History */}
        <Card>
          <CardHeader title="Medical history" />
          <div className="space-y-4 p-5">
            <div>
              <p className="text-[10px] tracking-wider text-subtle uppercase">
                Active conditions
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {patient.conditions.length > 0 ? (
                  patient.conditions.map((condition) => (
                    <Badge key={condition} tone="primary" size="md">
                      {condition}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-subtle">None recorded</span>
                )}
              </div>
            </div>

            <div>
              <p className="flex items-center gap-1.5 text-[10px] tracking-wider text-subtle uppercase">
                <Pill className="size-3" />
                Current medication
              </p>
              <div className="mt-2 space-y-1">
                {patient.currentMedications.length > 0 ? (
                  patient.currentMedications.map((med) => (
                    <p key={med} className="text-xs text-foreground">
                      {med}
                    </p>
                  ))
                ) : (
                  <span className="text-xs text-subtle">None</span>
                )}
              </div>
            </div>

            <div className="border-t border-white/8 pt-3 text-[11px] text-subtle">
              <p>DOB {formatDate(patient.dateOfBirth)}</p>
              <p className="mt-0.5">{patient.phone}</p>
              <p className="mt-0.5">{patient.address}</p>
            </div>
          </div>
        </Card>

        {/* Labs */}
        <Card>
          <CardHeader title="Laboratory results" />
          {labs.length === 0 ? (
            <EmptyState message="No laboratory investigations on record." />
          ) : (
            <div className="divide-y divide-white/6">
              {labs.map((report) => (
                <div key={report.id} className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-foreground">
                      {report.panel}
                    </p>
                    <Badge
                      tone={report.status === "reported" ? "success" : "warning"}
                    >
                      {report.status}
                    </Badge>
                  </div>

                  {report.analytes.length > 0 ? (
                    <div className="mt-3 space-y-1.5">
                      {report.analytes.map((analyte) => {
                        const flag = analyteFlag(
                          analyte.value,
                          analyte.refLow,
                          analyte.refHigh,
                        );
                        return (
                          <div
                            key={analyte.name}
                            className="flex items-center justify-between gap-3 text-xs"
                          >
                            <span className="text-muted">{analyte.name}</span>
                            <span className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "clinical-num font-medium",
                                  flag === "normal"
                                    ? "text-foreground"
                                    : flag === "high"
                                      ? "text-red-400"
                                      : "text-amber-400",
                                )}
                              >
                                {analyte.value} {analyte.unit}
                              </span>
                              {flag !== "normal" && (
                                <span
                                  className={cn(
                                    "text-[10px] font-bold",
                                    flag === "high" ? "text-red-400" : "text-amber-400",
                                  )}
                                >
                                  {flag === "high" ? "H" : "L"}
                                </span>
                              )}
                              <span className="clinical-num text-[10px] text-subtle">
                                ({analyte.refLow}–{analyte.refHigh})
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-subtle">
                      Awaiting results · ordered {relativeTime(report.orderedAt)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export function Patients() {
  const { patients } = useStore();
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.conditions.some((c) => c.toLowerCase().includes(q)),
    );
  }, [query, patients]);

  // Resolve from the store by id so newly recorded vitals appear immediately.
  const selected = selectedId
    ? (patients.find((p) => p.id === selectedId) ?? null)
    : null;

  if (selected) {
    return (
      <PatientRecord patient={selected} onClose={() => setSelectedId(null)} />
    );
  }

  return (
    <Card>
      <CardHeader
        title="Patient register"
        subtitle={`${patients.length} records`}
        action={
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, MRN or condition"
              aria-label="Search patients"
              className="w-56 rounded-lg border border-white/10 bg-black/25 py-1.5 pr-3 pl-8 text-xs text-foreground placeholder:text-subtle outline-none focus:border-primary/50"
            />
          </div>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState message="No patients match that search." />
      ) : (
        <Table
          headers={["Patient", "Age / Sex", "Status", "Location", "NEWS2", "Consultant", ""]}
        >
          {filtered.map((patient) => {
            const latest = patient.vitals[patient.vitals.length - 1];
            const score = latest ? calculateNews2(latest) : null;
            const presentation = score ? RISK_PRESENTATION[score.risk] : null;

            return (
              <tr
                key={patient.id}
                className="panel-hover cursor-pointer"
                onClick={() => setSelectedId(patient.id)}
              >
                <Td>
                  <p className="font-medium text-foreground">
                    {patient.firstName} {patient.lastName}
                  </p>
                  <p className="clinical-num text-[11px] text-subtle">
                    {patient.mrn}
                  </p>
                  {patient.allergies.length > 0 && (
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-red-400">
                      <ShieldAlert className="size-2.5" />
                      {patient.allergies.length} allergy
                      {patient.allergies.length > 1 ? "ies" : ""}
                    </p>
                  )}
                </Td>
                <Td className="clinical-num text-xs text-muted">
                  {calculateAge(patient.dateOfBirth)} / {patient.sex[0].toUpperCase()}
                </Td>
                <Td>
                  <Badge tone={STATUS_TONE[patient.status]}>{patient.status}</Badge>
                </Td>
                <Td className="text-xs text-muted">
                  {patient.ward ? `${patient.ward} ${patient.bed ?? ""}` : "—"}
                </Td>
                <Td>
                  {score && presentation ? (
                    <span className="flex items-center gap-2">
                      <span
                        className="clinical-num text-sm font-bold"
                        style={{ color: presentation.color }}
                      >
                        {score.total}
                      </span>
                      <Activity
                        className="size-3"
                        style={{ color: presentation.color }}
                      />
                    </span>
                  ) : (
                    <span className="text-xs text-subtle">—</span>
                  )}
                </Td>
                <Td className="text-xs text-muted">
                  {doctorName(patient.primaryDoctorId)}
                </Td>
                <Td>
                  <ChevronRight className="size-4 text-subtle" />
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
    </Card>
  );
}
