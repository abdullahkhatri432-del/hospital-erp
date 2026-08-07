"use client";

import * as React from "react";
import {
  CalendarClock,
  FileText,
  FlaskConical,
  Plus,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

import { DOCTORS, doctorName, patientName } from "@/data/seed";
import { calculateInvoice, formatINR } from "@/lib/billing";
import { analyteFlag, cn, formatDateTime, relativeTime } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { Appointment } from "@/types";
import { Badge, Card, CardHeader, Table, Td } from "@/components/ui/primitives";
import { BookAppointment } from "@/components/forms/book-appointment";
import { OrderLab, ReportLab } from "@/components/forms/lab-forms";
import { RecordPayment } from "@/components/forms/record-payment";
import { SettleClaim, SubmitClaim } from "@/components/forms/manage-claim";

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

/** Statuses a receptionist can move an appointment to from the list. */
const NEXT_STATUS: Partial<
  Record<Appointment["status"], { label: string; next: Appointment["status"] }[]>
> = {
  scheduled: [
    { label: "Check in", next: "checked-in" },
    { label: "Cancel", next: "cancelled" },
    { label: "No show", next: "no-show" },
  ],
  "checked-in": [
    { label: "Start", next: "in-consultation" },
    { label: "Cancel", next: "cancelled" },
  ],
  "in-consultation": [{ label: "Complete", next: "completed" }],
};

export function Appointments() {
  const { appointments, patients, dispatch } = useStore();
  const [booking, setBooking] = React.useState(false);

  const sorted = [...appointments].sort(
    (a, b) =>
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
  );

  return (
    <div className="space-y-5">
      {booking && (
        <Card className="p-5">
          <BookAppointment
            patients={patients}
            onClose={() => setBooking(false)}
          />
        </Card>
      )}

    <Card>
      <CardHeader
        title="Appointment schedule"
        subtitle={`${appointments.length} appointments across all departments`}
        action={
          <div className="flex items-center gap-3">
            <Badge tone="primary" size="md">
              <CalendarClock className="size-3" />
              {appointments.filter((a) => a.status === "scheduled").length} upcoming
            </Badge>
            {!booking && (
              <button
                type="button"
                onClick={() => setBooking(true)}
                className="flex items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-1.5 text-[11px] font-medium text-sky-300 transition-colors hover:bg-sky-500/20"
              >
                <Plus className="size-3" />
                Book appointment
              </button>
            )}
          </div>
        }
      />
      <Table
        headers={["Patient", "Consultant", "Scheduled", "Reason", "Status", "Actions"]}
      >
        {sorted.map((appointment) => {
          const actions = NEXT_STATUS[appointment.status] ?? [];
          const patient = patients.find((p) => p.id === appointment.patientId);

          return (
            <tr key={appointment.id} className="panel-hover">
              <Td className="font-medium text-foreground">
                {patient
                  ? `${patient.firstName} ${patient.lastName}`
                  : patientName(appointment.patientId)}
              </Td>
              <Td className="text-xs text-muted">
                {doctorName(appointment.doctorId)}
              </Td>
              <Td>
                <p className="clinical-num text-xs text-foreground">
                  {formatDateTime(appointment.scheduledAt)}
                </p>
                <p className="text-[11px] text-subtle">
                  {relativeTime(appointment.scheduledAt)} ·{" "}
                  {appointment.durationMinutes}m
                </p>
              </Td>
              <Td className="max-w-xs text-xs text-muted">
                {appointment.reason}
              </Td>
              <Td>
                <Badge tone={APPOINTMENT_TONE[appointment.status]}>
                  {appointment.status}
                </Badge>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {actions.map((action) => (
                    <button
                      key={action.next}
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: "set-appointment-status",
                          appointmentId: appointment.id,
                          status: action.next,
                        })
                      }
                      className="rounded border border-white/12 px-2 py-1 text-[10px] text-muted transition-colors hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-300"
                    >
                      {action.label}
                    </button>
                  ))}
                  {actions.length === 0 && (
                    <span className="text-[10px] text-subtle">—</span>
                  )}
                </div>
              </Td>
            </tr>
          );
        })}
      </Table>
    </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Laboratory                                                                */
/* -------------------------------------------------------------------------- */

export function Laboratory() {
  const { labs, patients, dispatch } = useStore();
  const [ordering, setOrdering] = React.useState(false);
  const [reportingId, setReportingId] = React.useState<string | null>(null);

  const sorted = [...labs].sort(
    (a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime(),
  );

  const reporting = reportingId
    ? (labs.find((r) => r.id === reportingId) ?? null)
    : null;

  const nameFor = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    return patient
      ? `${patient.firstName} ${patient.lastName}`
      : patientName(patientId);
  };

  return (
    <div className="space-y-5">
      {ordering && (
        <Card className="p-5">
          <OrderLab patients={patients} onClose={() => setOrdering(false)} />
        </Card>
      )}

      {reporting && (
        <Card className="p-5">
          <ReportLab
            report={reporting}
            patientLabel={nameFor(reporting.patientId)}
            onClose={() => setReportingId(null)}
          />
        </Card>
      )}

      <Card>
        <CardHeader
          title="Laboratory workflow"
          subtitle="Orders, collection and reporting status"
          action={
            <div className="flex items-center gap-3">
              <Badge tone="warning" size="md">
                <FlaskConical className="size-3" />
                {labs.filter((r) => r.status !== "reported").length} pending
              </Badge>
              {!ordering && (
                <button
                  type="button"
                  onClick={() => setOrdering(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-1.5 text-[11px] font-medium text-sky-300 transition-colors hover:bg-sky-500/20"
                >
                  <Plus className="size-3" />
                  Order test
                </button>
              )}
            </div>
          }
        />
        <Table
          headers={["Panel", "Patient", "Ordered by", "Ordered", "Status", "Actions"]}
        >
          {sorted.map((report) => (
            <tr key={report.id} className="panel-hover">
              <Td className="font-medium text-foreground">{report.panel}</Td>
              <Td className="text-xs text-muted">{nameFor(report.patientId)}</Td>
              <Td className="text-xs text-muted">{doctorName(report.doctorId)}</Td>
              <Td className="text-[11px] text-subtle">
                {relativeTime(report.orderedAt)}
              </Td>
              <Td>
                <Badge
                  tone={report.status === "reported" ? "success" : "warning"}
                >
                  {report.status}
                </Badge>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {report.status === "ordered" && (
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: "set-lab-status",
                          reportId: report.id,
                          status: "collected",
                          technician: "S. Kadam",
                        })
                      }
                      className="rounded border border-white/12 px-2 py-1 text-[10px] text-muted transition-colors hover:border-sky-500/40 hover:text-sky-300"
                    >
                      Collect sample
                    </button>
                  )}
                  {report.status === "collected" && (
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: "set-lab-status",
                          reportId: report.id,
                          status: "processing",
                        })
                      }
                      className="rounded border border-white/12 px-2 py-1 text-[10px] text-muted transition-colors hover:border-sky-500/40 hover:text-sky-300"
                    >
                      Start processing
                    </button>
                  )}
                  {report.status === "processing" && (
                    <button
                      type="button"
                      onClick={() => setReportingId(report.id)}
                      className="rounded border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 transition-colors hover:bg-emerald-500/20"
                    >
                      Enter results
                    </button>
                  )}
                  {report.status === "reported" && (
                    <span className="text-[10px] text-subtle">
                      {report.technician}
                    </span>
                  )}
                </div>
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
  const { invoices, patients } = useStore();
  const [payingId, setPayingId] = React.useState<string | null>(null);

  const totals = invoices.map((invoice) => ({
    invoice,
    computed: calculateInvoice(invoice),
  }));

  const paying = payingId
    ? (invoices.find((i) => i.id === payingId) ?? null)
    : null;

  const nameFor = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    return patient
      ? `${patient.firstName} ${patient.lastName}`
      : patientName(patientId);
  };

  const grandTotal = totals.reduce((sum, t) => sum + t.computed.total, 0);
  const collected = totals.reduce((sum, t) => sum + t.computed.paid, 0);
  const outstanding = totals.reduce((sum, t) => sum + t.computed.balance, 0);

  return (
    <div className="space-y-5">
      {paying && (
        <Card className="p-5">
          <RecordPayment
            invoice={paying}
            patientLabel={nameFor(paying.patientId)}
            onClose={() => setPayingId(null)}
          />
        </Card>
      )}

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
              {invoices.length} invoices
            </Badge>
          }
        />
        <Table
          headers={["Invoice", "Patient", "Issued", "Subtotal", "GST", "Total", "Balance", "Status", ""]}
        >
          {totals.map(({ invoice, computed }) => (
            <tr key={invoice.id} className="panel-hover">
              <Td className="clinical-num text-xs font-medium text-foreground">
                {invoice.invoiceNo}
              </Td>
              <Td className="text-xs text-muted">
                {nameFor(invoice.patientId)}
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
              <Td>
                {computed.balance > 0.01 ? (
                  <button
                    type="button"
                    onClick={() => setPayingId(invoice.id)}
                    className="rounded border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 transition-colors hover:bg-emerald-500/20"
                  >
                    Take payment
                  </button>
                ) : (
                  <span className="text-[10px] text-subtle">settled</span>
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
  const { claims: CLAIMS, invoices, patients } = useStore();
  const [submitting, setSubmitting] = React.useState(false);
  const [settlingId, setSettlingId] = React.useState<string | null>(null);
  const settling = settlingId
    ? (CLAIMS.find((c) => c.id === settlingId) ?? null)
    : null;
  const nameFor = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : patientName(patientId);
  };

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
      {submitting && (
        <Card className="p-5">
          <SubmitClaim
            invoices={invoices}
            patients={patients}
            onClose={() => setSubmitting(false)}
          />
        </Card>
      )}

      {settling && (
        <Card className="p-5">
          <SettleClaim claim={settling} onClose={() => setSettlingId(null)} />
        </Card>
      )}

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
            <div className="flex items-center gap-3">
              <Badge tone="primary" size="md">
                <ShieldCheck className="size-3" />
                {CLAIMS.length} claims
              </Badge>
              {!submitting && (
                <button
                  type="button"
                  onClick={() => setSubmitting(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-1.5 text-[11px] font-medium text-sky-300 transition-colors hover:bg-sky-500/20"
                >
                  <Plus className="size-3" />
                  Submit claim
                </button>
              )}
            </div>
          }
        />
        <Table
          headers={["Claim", "Patient", "Provider", "Claimed", "Approved", "Status", ""]}
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
                {nameFor(claim.patientId)}
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
              <Td>
                <Badge tone={CLAIM_TONE[claim.status]}>{claim.status}</Badge>
                <p className="mt-0.5 text-[10px] text-subtle">
                  {relativeTime(claim.submittedAt)}
                </p>
                {claim.rejectionReason && (
                  <p className="mt-1 max-w-[16rem] text-[10px] text-subtle">
                    {claim.rejectionReason}
                  </p>
                )}
              </Td>
              <Td>
                {claim.approvedAmount === null ? (
                  <button
                    type="button"
                    onClick={() => setSettlingId(claim.id)}
                    className="rounded border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 transition-colors hover:bg-emerald-500/20"
                  >
                    Settle
                  </button>
                ) : (
                  <span className="text-[10px] text-subtle">settled</span>
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
