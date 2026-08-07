"use client";

import {
  CalendarClock,
  FileText,
  FlaskConical,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

import {
  APPOINTMENTS,
  CLAIMS,
  DOCTORS,
  INVOICES,
  LAB_REPORTS,
  doctorName,
  patientName,
} from "@/data/seed";
import { calculateInvoice, formatINR } from "@/lib/billing";
import { analyteFlag, cn, formatDateTime, relativeTime } from "@/lib/utils";
import { Badge, Card, CardHeader, Table, Td } from "@/components/ui/primitives";

/* -------------------------------------------------------------------------- */
/*  Appointments                                                              */
/* -------------------------------------------------------------------------- */

const APPOINTMENT_TONE = {
  scheduled: "primary",
  "checked-in": "warning",
  "in-consultation": "warning",
  completed: "success",
  cancelled: "neutral",
  "no-show": "danger",
} as const;

export function Appointments() {
  const sorted = [...APPOINTMENTS].sort(
    (a, b) =>
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
  );

  return (
    <Card>
      <CardHeader
        title="Appointment schedule"
        subtitle={`${APPOINTMENTS.length} appointments across all departments`}
        action={
          <Badge tone="primary" size="md">
            <CalendarClock className="size-3" />
            {APPOINTMENTS.filter((a) => a.status === "scheduled").length} upcoming
          </Badge>
        }
      />
      <Table
        headers={["Patient", "Consultant", "Scheduled", "Reason", "Duration", "Status"]}
      >
        {sorted.map((appointment) => (
          <tr key={appointment.id} className="panel-hover">
            <Td className="font-medium text-foreground">
              {patientName(appointment.patientId)}
            </Td>
            <Td className="text-xs text-muted">
              {doctorName(appointment.doctorId)}
            </Td>
            <Td>
              <p className="clinical-num text-xs text-foreground">
                {formatDateTime(appointment.scheduledAt)}
              </p>
              <p className="text-[11px] text-subtle">
                {relativeTime(appointment.scheduledAt)}
              </p>
            </Td>
            <Td className="max-w-xs text-xs text-muted">{appointment.reason}</Td>
            <Td className="clinical-num text-xs text-muted">
              {appointment.durationMinutes}m
            </Td>
            <Td>
              <Badge tone={APPOINTMENT_TONE[appointment.status]}>
                {appointment.status}
              </Badge>
            </Td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Laboratory                                                                */
/* -------------------------------------------------------------------------- */

export function Laboratory() {
  const sorted = [...LAB_REPORTS].sort(
    (a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime(),
  );

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Laboratory workflow"
          subtitle="Orders, collection and reporting status"
          action={
            <Badge tone="warning" size="md">
              <FlaskConical className="size-3" />
              {LAB_REPORTS.filter((r) => r.status !== "reported").length} pending
            </Badge>
          }
        />
        <Table
          headers={["Panel", "Patient", "Ordered by", "Ordered", "Technician", "Status"]}
        >
          {sorted.map((report) => (
            <tr key={report.id} className="panel-hover">
              <Td className="font-medium text-foreground">{report.panel}</Td>
              <Td className="text-xs text-muted">
                {patientName(report.patientId)}
              </Td>
              <Td className="text-xs text-muted">{doctorName(report.doctorId)}</Td>
              <Td className="text-[11px] text-subtle">
                {relativeTime(report.orderedAt)}
              </Td>
              <Td className="text-xs text-muted">{report.technician ?? "—"}</Td>
              <Td>
                <Badge
                  tone={report.status === "reported" ? "success" : "warning"}
                >
                  {report.status}
                </Badge>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* Reported results with reference ranges */}
      <div className="grid gap-5 lg:grid-cols-2">
        {sorted
          .filter((report) => report.analytes.length > 0)
          .map((report) => (
            <Card key={report.id}>
              <CardHeader
                title={report.panel}
                subtitle={`${patientName(report.patientId)} · reported ${
                  report.reportedAt ? relativeTime(report.reportedAt) : "—"
                }`}
              />
              <div className="divide-y divide-white/6">
                {report.analytes.map((analyte) => {
                  const flag = analyteFlag(
                    analyte.value,
                    analyte.refLow,
                    analyte.refHigh,
                  );
                  // Position the marker within the reference band for a visual cue.
                  const span = analyte.refHigh - analyte.refLow || 1;
                  const pct = Math.max(
                    0,
                    Math.min(100, ((analyte.value - analyte.refLow) / span) * 100),
                  );

                  return (
                    <div key={analyte.name} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted">{analyte.name}</span>
                        <span className="flex items-baseline gap-1.5">
                          <span
                            className={cn(
                              "clinical-num text-sm font-semibold",
                              flag === "normal"
                                ? "text-foreground"
                                : flag === "high"
                                  ? "text-red-400"
                                  : "text-amber-400",
                            )}
                          >
                            {analyte.value}
                          </span>
                          <span className="text-[10px] text-subtle">
                            {analyte.unit}
                          </span>
                          {flag !== "normal" && (
                            <Badge tone={flag === "high" ? "danger" : "warning"}>
                              {flag}
                            </Badge>
                          )}
                        </span>
                      </div>

                      <div className="relative mt-2 h-1 rounded-full bg-white/8">
                        <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-emerald-500/20" />
                        <div
                          className={cn(
                            "absolute top-1/2 size-2 -translate-y-1/2 rounded-full",
                            flag === "normal" ? "bg-emerald-400" : "bg-red-400",
                          )}
                          style={{ left: `${pct}%` }}
                        />
                      </div>
                      <p className="clinical-num mt-1 text-[10px] text-subtle">
                        Reference {analyte.refLow}–{analyte.refHigh} {analyte.unit}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Billing                                                                   */
/* -------------------------------------------------------------------------- */

const INVOICE_TONE = {
  draft: "neutral",
  issued: "primary",
  "part-paid": "warning",
  paid: "success",
  overdue: "danger",
} as const;

export function Billing() {
  const totals = INVOICES.map((invoice) => ({
    invoice,
    computed: calculateInvoice(invoice),
  }));

  const grandTotal = totals.reduce((sum, t) => sum + t.computed.total, 0);
  const collected = totals.reduce((sum, t) => sum + t.computed.paid, 0);
  const outstanding = totals.reduce((sum, t) => sum + t.computed.balance, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total invoiced", value: grandTotal, tone: "text-foreground" },
          { label: "Collected", value: collected, tone: "text-emerald-400" },
          { label: "Outstanding", value: outstanding, tone: "text-amber-400" },
        ].map((tile) => (
          <Card key={tile.label} className="p-5">
            <p className="text-[10px] tracking-wider text-subtle uppercase">
              {tile.label}
            </p>
            <p className={cn("clinical-num mt-2 text-xl font-bold", tile.tone)}>
              {formatINR(tile.value)}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Invoices"
          subtitle="GST applied per line item; totals computed in integer paise"
          action={
            <Badge tone="primary" size="md">
              <FileText className="size-3" />
              {INVOICES.length} invoices
            </Badge>
          }
        />
        <Table
          headers={["Invoice", "Patient", "Issued", "Subtotal", "GST", "Total", "Balance", "Status"]}
        >
          {totals.map(({ invoice, computed }) => (
            <tr key={invoice.id} className="panel-hover">
              <Td className="clinical-num text-xs font-medium text-foreground">
                {invoice.invoiceNo}
              </Td>
              <Td className="text-xs text-muted">
                {patientName(invoice.patientId)}
              </Td>
              <Td className="text-[11px] text-subtle">
                {relativeTime(invoice.issuedAt)}
              </Td>
              <Td className="clinical-num text-xs text-muted">
                {formatINR(computed.subtotal)}
              </Td>
              <Td className="clinical-num text-xs text-muted">
                {formatINR(computed.taxTotal)}
              </Td>
              <Td className="clinical-num text-xs font-semibold text-foreground">
                {formatINR(computed.total)}
              </Td>
              <Td
                className={cn(
                  "clinical-num text-xs",
                  computed.balance > 0 ? "text-amber-400" : "text-emerald-400",
                )}
              >
                {formatINR(computed.balance)}
              </Td>
              <Td>
                <Badge tone={INVOICE_TONE[invoice.status]}>{invoice.status}</Badge>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Insurance                                                                 */
/* -------------------------------------------------------------------------- */

const CLAIM_TONE = {
  draft: "neutral",
  submitted: "primary",
  "under-review": "warning",
  approved: "success",
  "partially-approved": "warning",
  rejected: "danger",
} as const;

export function Insurance() {
  const totalClaimed = CLAIMS.reduce((sum, c) => sum + c.claimedAmount, 0);
  const totalApproved = CLAIMS.reduce((sum, c) => sum + (c.approvedAmount ?? 0), 0);
  const settled = CLAIMS.filter((c) => c.approvedAmount !== null);
  // Approval rate is only meaningful across settled claims.
  const approvalRate =
    settled.length > 0
      ? (settled.reduce((sum, c) => sum + (c.approvedAmount ?? 0), 0) /
          settled.reduce((sum, c) => sum + c.claimedAmount, 0)) *
        100
      : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-[10px] tracking-wider text-subtle uppercase">
            Total claimed
          </p>
          <p className="clinical-num mt-2 text-xl font-bold text-foreground">
            {formatINR(totalClaimed)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] tracking-wider text-subtle uppercase">
            Approved to date
          </p>
          <p className="clinical-num mt-2 text-xl font-bold text-emerald-400">
            {formatINR(totalApproved)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] tracking-wider text-subtle uppercase">
            Settlement rate
          </p>
          <p className="clinical-num mt-2 text-xl font-bold text-sky-400">
            {approvalRate.toFixed(1)}%
          </p>
          <p className="mt-1 text-[10px] text-subtle">
            across {settled.length} settled claim{settled.length === 1 ? "" : "s"}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Insurance claims"
          subtitle="Submission and settlement tracking"
          action={
            <Badge tone="primary" size="md">
              <ShieldCheck className="size-3" />
              {CLAIMS.length} claims
            </Badge>
          }
        />
        <Table
          headers={["Claim", "Patient", "Provider", "Claimed", "Approved", "Submitted", "Status"]}
        >
          {CLAIMS.map((claim) => (
            <tr key={claim.id} className="panel-hover">
              <Td>
                <p className="clinical-num text-xs font-medium text-foreground">
                  {claim.claimNo}
                </p>
                <p className="clinical-num text-[10px] text-subtle">
                  {claim.policyNo}
                </p>
              </Td>
              <Td className="text-xs text-muted">
                {patientName(claim.patientId)}
              </Td>
              <Td className="text-xs text-muted">{claim.provider}</Td>
              <Td className="clinical-num text-xs text-foreground">
                {formatINR(claim.claimedAmount)}
              </Td>
              <Td
                className={cn(
                  "clinical-num text-xs",
                  claim.approvedAmount === null
                    ? "text-subtle"
                    : claim.approvedAmount < claim.claimedAmount
                      ? "text-amber-400"
                      : "text-emerald-400",
                )}
              >
                {claim.approvedAmount === null
                  ? "pending"
                  : formatINR(claim.approvedAmount)}
              </Td>
              <Td className="text-[11px] text-subtle">
                {relativeTime(claim.submittedAt)}
              </Td>
              <Td>
                <Badge tone={CLAIM_TONE[claim.status]}>{claim.status}</Badge>
                {claim.rejectionReason && (
                  <p className="mt-1 max-w-[16rem] text-[10px] text-subtle">
                    {claim.rejectionReason}
                  </p>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Doctors                                                                   */
/* -------------------------------------------------------------------------- */

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function Doctors() {
  return (
    <Card>
      <CardHeader
        title="Medical staff"
        subtitle={`${DOCTORS.filter((d) => d.onDuty).length} of ${DOCTORS.length} currently on duty`}
        action={
          <Badge tone="primary" size="md">
            <Stethoscope className="size-3" />
            {new Set(DOCTORS.map((d) => d.department)).size} departments
          </Badge>
        }
      />
      <Table
        headers={["Consultant", "Department", "Registration", "Availability", "Fee", "Status"]}
      >
        {DOCTORS.map((doctor) => (
          <tr key={doctor.id} className="panel-hover">
            <Td>
              <p className="font-medium text-foreground">{doctor.name}</p>
              <p className="text-[11px] text-subtle">{doctor.specialisation}</p>
            </Td>
            <Td className="text-xs text-muted">{doctor.department}</Td>
            <Td className="clinical-num text-[11px] text-subtle">
              {doctor.registrationNo}
            </Td>
            <Td>
              <div className="flex gap-0.5">
                {WEEKDAYS.map((day, index) => (
                  <span
                    key={index}
                    className={cn(
                      "flex size-4 items-center justify-center rounded text-[9px] font-medium",
                      doctor.availableDays.includes(index)
                        ? "bg-sky-500/20 text-sky-300"
                        : "bg-white/5 text-subtle",
                    )}
                  >
                    {day}
                  </span>
                ))}
              </div>
            </Td>
            <Td className="clinical-num text-xs text-muted">
              {formatINR(doctor.consultationFee)}
            </Td>
            <Td>
              <Badge tone={doctor.onDuty ? "success" : "neutral"}>
                {doctor.onDuty ? "on duty" : "off duty"}
              </Badge>
            </Td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}
