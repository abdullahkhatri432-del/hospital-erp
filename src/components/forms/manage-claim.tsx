"use client";

import * as React from "react";
import { AlertTriangle, Check, X } from "lucide-react";

import { calculateInvoice, formatINR } from "@/lib/billing";
import { makeId, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ClaimStatus, InsuranceClaim, Invoice, Patient } from "@/types";

/**
 * Build a claim reference. Defined outside the component so the linter can
 * see it is an event-time helper, not something evaluated during render.
 */
function buildClaimNo(): string {
  const now = new Date();
  return `CLM-${now.getFullYear()}-${now.getTime().toString().slice(-4)}`;
}

const PROVIDERS = [
  "Star Health",
  "HDFC ERGO",
  "ICICI Lombard",
  "Bajaj Allianz",
  "Niva Bupa",
  "Care Health",
];

/**
 * Submit a new insurance claim against an unclaimed invoice.
 *
 * The claimed amount defaults to the outstanding balance and cannot exceed
 * the invoice total — claiming more than was billed is the most common
 * data-entry error in this workflow.
 */
export function SubmitClaim({
  invoices,
  patients,
  onClose,
}: {
  invoices: Invoice[];
  patients: Patient[];
  onClose: () => void;
}) {
  const { dispatch } = useStore();

  // Only invoices with no existing claim and a non-zero balance are eligible.
  const eligible = invoices.filter(
    (invoice) => !invoice.claimId && calculateInvoice(invoice).balance > 0,
  );

  const [invoiceId, setInvoiceId] = React.useState(eligible[0]?.id ?? "");
  const invoice = eligible.find((i) => i.id === invoiceId);
  const patient = patients.find((p) => p.id === invoice?.patientId);
  const computed = invoice ? calculateInvoice(invoice) : null;

  const [provider, setProvider] = React.useState(PROVIDERS[0]);
  // Null means "follow the selected invoice"; a string means the user typed it.
  const [policyOverride, setPolicyOverride] = React.useState<string | null>(null);
  const [amountOverride, setAmountOverride] = React.useState<string | null>(null);

  // Derived defaults, so changing invoice updates them without an effect.
  const policyNo = policyOverride ?? patient?.insuranceId ?? "";
  const amount = amountOverride ?? (computed ? computed.balance.toFixed(2) : "");

  const setPolicyNo = setPolicyOverride;
  const setAmount = setAmountOverride;

  const parsed = Number(amount);
  const valid =
    Boolean(invoice) &&
    policyNo.trim().length > 3 &&
    Number.isFinite(parsed) &&
    parsed > 0 &&
    Boolean(computed) &&
    parsed <= (computed?.total ?? 0) + 0.001;

  if (eligible.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-semibold text-foreground">Submit claim</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded-lg border border-white/10 text-muted hover:bg-white/8"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <p className="text-xs text-subtle">
          Every invoice with an outstanding balance already has a claim
          attached. Record a new invoice to raise another.
        </p>
      </div>
    );
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || !invoice) return;

    const claim: InsuranceClaim = {
      id: makeId("CL"),
      claimNo: buildClaimNo(),
      patientId: invoice.patientId,
      invoiceId: invoice.id,
      provider,
      policyNo: policyNo.trim(),
      claimedAmount: parsed,
      approvedAmount: null,
      status: "submitted",
      submittedAt: new Date().toISOString(),
      settledAt: null,
      rejectionReason: null,
    };

    dispatch({ type: "submit-claim", claim });
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Submit claim</h3>
          <p className="mt-0.5 text-xs text-subtle">
            {eligible.length} invoice{eligible.length === 1 ? "" : "s"} eligible
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
        <div className="sm:col-span-2">
          <label
            htmlFor="claim-invoice"
            className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
          >
            Invoice
          </label>
          <select
            id="claim-invoice"
            value={invoiceId}
            onChange={(event) => {
              setInvoiceId(event.target.value);
              setPolicyOverride(null);
              setAmountOverride(null);
            }}
            className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
          >
            {eligible.map((option) => {
              const owner = patients.find((p) => p.id === option.patientId);
              return (
                <option key={option.id} value={option.id}>
                  {option.invoiceNo} — {owner?.firstName} {owner?.lastName} (
                  {formatINR(calculateInvoice(option).balance)} due)
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label
            htmlFor="claim-provider"
            className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
          >
            Provider
          </label>
          <select
            id="claim-provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
          >
            {PROVIDERS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="claim-policy"
            className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
          >
            Policy number
          </label>
          <input
            id="claim-policy"
            type="text"
            value={policyNo}
            onChange={(event) => setPolicyNo(event.target.value)}
            placeholder="INS-XXXX-00000"
            className="clinical-num w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground placeholder:text-subtle outline-none focus:border-primary/50"
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="claim-amount"
            className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
          >
            Amount claimed
          </label>
          <input
            id="claim-amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="clinical-num w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
          />
          {computed && (
            <p className="mt-1 text-[10px] text-subtle">
              Invoice total {formatINR(computed.total)} · outstanding{" "}
              {formatINR(computed.balance)}
            </p>
          )}
        </div>
      </div>

      {!valid && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-2.5">
          <AlertTriangle className="size-3.5 shrink-0 text-amber-400" />
          <p className="text-[11px] text-amber-300">
            {policyNo.trim().length <= 3
              ? "Enter a valid policy number."
              : parsed > (computed?.total ?? 0)
                ? "Claimed amount cannot exceed the invoice total."
                : "Enter an amount greater than zero."}
          </p>
        </div>
      )}

      <div className="flex gap-2 border-t border-white/8 pt-4">
        <button
          type="submit"
          disabled={!valid}
          className={cn(
            "rounded-lg px-4 py-2 text-xs font-semibold transition-opacity",
            valid
              ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:opacity-90"
              : "cursor-not-allowed bg-white/8 text-subtle",
          )}
        >
          Submit claim
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
 * Settle an open claim.
 *
 * Approving less than the claimed amount requires a reason — insurers are
 * obliged to give one, and the shortfall becomes patient liability.
 */
export function SettleClaim({
  claim,
  onClose,
}: {
  claim: InsuranceClaim;
  onClose: () => void;
}) {
  const { dispatch } = useStore();
  const [approved, setApproved] = React.useState(
    claim.claimedAmount.toFixed(2),
  );
  const [reason, setReason] = React.useState("");

  const parsed = Number(approved);
  const isFull = Math.abs(parsed - claim.claimedAmount) < 0.01;
  const isRejection = parsed === 0;
  const needsReason = !isFull;
  const valid =
    Number.isFinite(parsed) &&
    parsed >= 0 &&
    parsed <= claim.claimedAmount + 0.001 &&
    (!needsReason || reason.trim().length > 4);

  const status: ClaimStatus = isRejection
    ? "rejected"
    : isFull
      ? "approved"
      : "partially-approved";

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;

    dispatch({
      type: "settle-claim",
      claimId: claim.id,
      status,
      approvedAmount: parsed,
      rejectionReason: needsReason ? reason.trim() : null,
    });
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Settle claim
          </h3>
          <p className="clinical-num mt-0.5 text-xs text-subtle">
            {claim.claimNo} · {claim.provider} · claimed{" "}
            {formatINR(claim.claimedAmount)}
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
        <label
          htmlFor="settle-amount"
          className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
        >
          Amount approved
        </label>
        <input
          id="settle-amount"
          type="number"
          step="0.01"
          min="0"
          max={claim.claimedAmount}
          value={approved}
          onChange={(event) => setApproved(event.target.value)}
          className="clinical-num w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
        />
        <div className="mt-1.5 flex gap-1.5">
          <button
            type="button"
            onClick={() => setApproved(claim.claimedAmount.toFixed(2))}
            className="rounded border border-white/12 px-2 py-1 text-[10px] text-muted transition-colors hover:border-emerald-500/40 hover:text-emerald-300"
          >
            Approve in full
          </button>
          <button
            type="button"
            onClick={() => setApproved((claim.claimedAmount * 0.8).toFixed(2))}
            className="rounded border border-white/12 px-2 py-1 text-[10px] text-muted transition-colors hover:border-amber-500/40 hover:text-amber-300"
          >
            80%
          </button>
          <button
            type="button"
            onClick={() => setApproved("0")}
            className="rounded border border-white/12 px-2 py-1 text-[10px] text-muted transition-colors hover:border-red-500/40 hover:text-red-300"
          >
            Reject
          </button>
        </div>
      </div>

      {needsReason && (
        <div>
          <label
            htmlFor="settle-reason"
            className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
          >
            {isRejection ? "Rejection reason" : "Reason for partial approval"}
          </label>
          <input
            id="settle-reason"
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Diagnostic sub-limit exceeded"
            className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground placeholder:text-subtle outline-none focus:border-primary/50"
          />
        </div>
      )}

      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2.5",
          status === "approved"
            ? "border-emerald-500/25 bg-emerald-500/8"
            : status === "rejected"
              ? "border-red-500/25 bg-red-500/8"
              : "border-amber-500/25 bg-amber-500/8",
        )}
      >
        <Check
          className={cn(
            "size-3.5",
            status === "approved"
              ? "text-emerald-400"
              : status === "rejected"
                ? "text-red-400"
                : "text-amber-400",
          )}
        />
        <p className="text-[11px] text-muted">
          Will be marked <span className="font-medium">{status}</span>.
          {!isFull &&
            ` Shortfall of ${formatINR(claim.claimedAmount - parsed)} becomes patient liability.`}
        </p>
      </div>

      <div className="flex gap-2 border-t border-white/8 pt-4">
        <button
          type="submit"
          disabled={!valid}
          className={cn(
            "rounded-lg px-4 py-2 text-xs font-semibold transition-opacity",
            valid
              ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:opacity-90"
              : "cursor-not-allowed bg-white/8 text-subtle",
          )}
        >
          Settle claim
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
