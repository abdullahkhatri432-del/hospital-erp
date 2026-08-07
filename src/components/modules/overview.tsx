"use client";

import {
  Activity,
  AlertTriangle,
  BedDouble,
  CalendarClock,
  IndianRupee,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { DOCTORS, patientName } from "@/data/seed";
import { calculateInvoice, formatINRCompact } from "@/lib/billing";
import { calculateNews2, RISK_PRESENTATION } from "@/lib/clinical/news2";
import { cn, relativeTime } from "@/lib/utils";
import { Badge, Card, CardHeader, EmptyState, Table, Td } from "@/components/ui/primitives";
import { useStore } from "@/lib/store";
import { wardOccupancy } from "@/lib/wards";

/** Headline metric tile. */
function Kpi({
  icon: Icon,
  label,
  value,
  detail,
  intent = "default",
}: {
  icon: typeof Users;
  label: string;
  value: string;
  detail: string;
  intent?: "default" | "warning" | "critical" | "positive";
}) {
  const tone = {
    default: "text-sky-400 bg-sky-500/10",
    positive: "text-emerald-400 bg-emerald-500/10",
    warning: "text-amber-400 bg-amber-500/10",
    critical: "text-red-400 bg-red-500/10",
  }[intent];

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span className={cn("flex size-9 items-center justify-center rounded-xl", tone)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="clinical-num mt-4 text-2xl font-bold text-foreground">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
      <p className="mt-2 text-[11px] text-subtle">{detail}</p>
    </Card>
  );
}

export function Overview() {
  const { patients: PATIENTS, appointments: APPOINTMENTS, drugs: DRUGS, labs: LAB_REPORTS, invoices: INVOICES, claims: CLAIMS } = useStore();
  const occupancy = wardOccupancy(PATIENTS);

  /* -- Derived metrics ---------------------------------------------------- */

  const admitted = PATIENTS.filter(
    (p) => p.status === "admitted" || p.status === "critical",
  );

  // Score every admitted patient and surface anyone deteriorating.
  const scored = admitted
    .map((patient) => {
      const latest = patient.vitals[patient.vitals.length - 1];
      return latest
        ? { patient, score: calculateNews2(latest) }
        : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => b.score.total - a.score.total);

  const needsEscalation = scored.filter(
    (entry) => entry.score.risk === "high" || entry.score.risk === "medium",
  );

  const todayAppointments = APPOINTMENTS.filter((appointment) => {
    const when = new Date(appointment.scheduledAt);
    const today = new Date();
    return when.toDateString() === today.toDateString();
  });

  const revenue = INVOICES.reduce(
    (sum, invoice) => sum + calculateInvoice(invoice).total,
    0,
  );
  const outstanding = INVOICES.reduce(
    (sum, invoice) => sum + calculateInvoice(invoice).balance,
    0,
  );

  const lowStock = DRUGS.filter((drug) => drug.stock < drug.reorderLevel);
  const expired = DRUGS.filter((drug) => new Date(drug.expiryDate) < new Date());
  const pendingLabs = LAB_REPORTS.filter((r) => r.status !== "reported");
  const openClaims = CLAIMS.filter(
    (c) => c.status === "submitted" || c.status === "under-review",
  );

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={BedDouble}
          label="Currently admitted"
          value={String(admitted.length)}
          detail={`${PATIENTS.filter((p) => p.status === "critical").length} in critical care`}
          intent={admitted.length > 0 ? "default" : "default"}
        />
        <Kpi
          icon={AlertTriangle}
          label="Requiring escalation"
          value={String(needsEscalation.length)}
          detail="NEWS2 medium or high risk"
          intent={needsEscalation.length > 0 ? "critical" : "positive"}
        />
        <Kpi
          icon={CalendarClock}
          label="Appointments today"
          value={String(todayAppointments.length)}
          detail={`${DOCTORS.filter((d) => d.onDuty).length} of ${DOCTORS.length} doctors on duty`}
        />
        <Kpi
          icon={IndianRupee}
          label="Outstanding balance"
          value={formatINRCompact(outstanding)}
          detail={`${formatINRCompact(revenue)} invoiced in total`}
          intent={outstanding > 0 ? "warning" : "positive"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        {/* Deterioration watchlist */}
        <Card>
          <CardHeader
            title="Deterioration watchlist"
            subtitle="Admitted patients ranked by latest NEWS2 aggregate score"
            action={
              <Badge tone={needsEscalation.length > 0 ? "danger" : "success"}>
                {needsEscalation.length} need review
              </Badge>
            }
          />

          {scored.length === 0 ? (
            <EmptyState message="No admitted patients with recorded observations." />
          ) : (
            <Table headers={["Patient", "Ward", "NEWS2", "Risk", "Last obs"]}>
              {scored.map(({ patient, score }) => {
                const presentation = RISK_PRESENTATION[score.risk];
                return (
                  <tr key={patient.id} className="panel-hover">
                    <Td>
                      <p className="font-medium text-foreground">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="text-[11px] text-subtle">{patient.mrn}</p>
                    </Td>
                    <Td className="text-xs text-muted">
                      {patient.ward}
                      {patient.bed && ` · ${patient.bed}`}
                    </Td>
                    <Td>
                      <span
                        className="clinical-num inline-flex size-7 items-center justify-center rounded-lg text-sm font-bold"
                        style={{
                          background: presentation.bg,
                          color: presentation.color,
                        }}
                      >
                        {score.total}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className="text-xs font-medium"
                        style={{ color: presentation.color }}
                      >
                        {presentation.label}
                      </span>
                      {score.redFlag && (
                        <p className="text-[10px] text-amber-400">
                          single-param red flag
                        </p>
                      )}
                    </Td>
                    <Td className="text-[11px] text-subtle">
                      {relativeTime(
                        patient.vitals[patient.vitals.length - 1].recordedAt,
                      )}
                    </Td>
                  </tr>
                );
              })}
            </Table>
          )}

          <p className="border-t border-white/8 px-5 py-3 text-[10px] leading-relaxed text-subtle">
            NEWS2 (Royal College of Physicians, 2017) is a deterioration
            detection aid for trained staff. It supports clinical judgement and
            does not replace it.
          </p>
        </Card>

        {/* Operational alerts */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Operational alerts" />
            <div className="divide-y divide-white/6">
              {expired.map((drug) => (
                <div key={drug.id} className="flex gap-3 px-5 py-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      Expired batch — {drug.name}
                    </p>
                    <p className="text-[11px] text-subtle">
                      Batch {drug.batchNo}. Quarantine and do not dispense.
                    </p>
                  </div>
                </div>
              ))}

              {lowStock.map((drug) => (
                <div key={drug.id} className="flex gap-3 px-5 py-3">
                  <TrendingDown className="mt-0.5 size-4 shrink-0 text-amber-400" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      Below reorder level — {drug.name}
                    </p>
                    <p className="text-[11px] text-subtle">
                      {drug.stock} in stock, reorder at {drug.reorderLevel}.
                    </p>
                  </div>
                </div>
              ))}

              {pendingLabs.length > 0 && (
                <div className="flex gap-3 px-5 py-3">
                  <Activity className="mt-0.5 size-4 shrink-0 text-sky-400" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {pendingLabs.length} lab reports pending
                    </p>
                    <p className="text-[11px] text-subtle">
                      {pendingLabs.map((r) => r.panel).join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {openClaims.length > 0 && (
                <div className="flex gap-3 px-5 py-3">
                  <TrendingUp className="mt-0.5 size-4 shrink-0 text-teal-400" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {openClaims.length} insurance claims awaiting settlement
                    </p>
                    <p className="text-[11px] text-subtle">
                      {formatINRCompact(
                        openClaims.reduce((s, c) => s + c.claimedAmount, 0),
                      )}{" "}
                      claimed
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Ward occupancy */}
          <Card>
            <CardHeader title="Ward occupancy" />
            <div className="space-y-3 p-5">
              {occupancy.map((ward) => (
                <div key={ward.ward}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-muted">{ward.ward}</span>
                    <span className="clinical-num text-subtle">
                      {ward.occupied} / {ward.total}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${ward.percent}%`,
                        background:
                          ward.percent >= 90
                            ? "#EF4444"
                            : ward.percent >= 70
                              ? "#F59E0B"
                              : "#22C55E",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Upcoming appointments */}
          <Card>
            <CardHeader title="Next appointments" />
            <div className="divide-y divide-white/6">
              {APPOINTMENTS.filter(
                (a) => a.status === "scheduled" && new Date(a.scheduledAt) > new Date(),
              )
                .sort(
                  (a, b) =>
                    new Date(a.scheduledAt).getTime() -
                    new Date(b.scheduledAt).getTime(),
                )
                .slice(0, 4)
                .map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">
                        {patientName(appointment.patientId)}
                      </p>
                      <p className="truncate text-[11px] text-subtle">
                        {appointment.reason}
                      </p>
                    </div>
                    <span className="clinical-num shrink-0 text-[11px] text-sky-400">
                      {relativeTime(appointment.scheduledAt)}
                    </span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
