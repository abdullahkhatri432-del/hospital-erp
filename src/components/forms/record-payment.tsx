"use client";

import * as React from "react";
import { AlertTriangle, Check, IndianRupee, X } from "lucide-react";

import { calculateInvoice, formatINR } from "@/lib/billing";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/types";

/**
 * Payment capture.
 *
 * Validates against the outstanding balance so an invoice can never be
 * overpaid, and offers common shortcuts (full balance, half) because those
 * are what a billing desk actually uses.
 */
export function RecordPayment({
  invoice,
  patientLabel,
  onClose,
}: {
  invoice: Invoice;
  patientLabel: string;
  onClose: () => void;
}) {
  const { dispatch } = useStore();
  const computed = calculateInvoice(invoice);

  const [amount, setAmount] = React.useState<string>(
    computed.balance > 0 ? computed.balance.toFixed(2) : "0",
  );
  const [method, setMethod] = React.useState("Card");

  const parsed = Number(amount);
  const valid =
    Number.isFinite(parsed) && parsed > 0 && parsed <= computed.balance + 0.001;

  const error =
    !Number.isFinite(parsed) || parsed <= 0
      ? "Enter an amount greater than zero."
      : parsed > computed.balance + 0.001
        ? `Exceeds the outstanding balance of ${formatINR(computed.balance)}.`
        : null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    dispatch({ type: "record-payment", invoiceId: invoice.id, amount: parsed });
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Record payment
          </h3>
          <p className="mt-0.5 text-xs text-subtle">
            {invoice.invoiceNo} · {patientLabel}
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

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Invoice total", value: computed.total },
          { label: "Already paid", value: computed.paid },
          { label: "Outstanding", value: computed.balance },
        ].map((tile, index) => (
          <div
            key={tile.label}
            className="rounded-xl border border-white/8 bg-black/20 p-3"
          >
            <p className="text-[10px] tracking-wider text-subtle uppercase">
              {tile.label}
            </p>
            <p
              className={cn(
                "clinical-num mt-1 text-sm font-semibold",
                index === 2 ? "text-amber-400" : "text-foreground",
              )}
            >
              {formatINR(tile.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="pay-amount"
            className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
          >
            Amount received
          </label>
          <div className="relative">
            <IndianRupee className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-subtle" />
            <input
              id="pay-amount"
              type="number"
              step="0.01"
              min="0"
              max={computed.balance}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="clinical-num w-full rounded-lg border border-white/10 bg-black/25 py-2 pr-3 pl-9 text-sm text-foreground outline-none focus:border-primary/50"
            />
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={() => setAmount(computed.balance.toFixed(2))}
              className="rounded border border-white/12 px-2 py-1 text-[10px] text-muted transition-colors hover:border-sky-500/40 hover:text-sky-300"
            >
              Full balance
            </button>
            <button
              type="button"
              onClick={() => setAmount((computed.balance / 2).toFixed(2))}
              className="rounded border border-white/12 px-2 py-1 text-[10px] text-muted transition-colors hover:border-sky-500/40 hover:text-sky-300"
            >
              Half
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="pay-method"
            className="mb-1 block text-[10px] tracking-wider text-subtle uppercase"
          >
            Method
          </label>
          <select
            id="pay-method"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
          >
            {["Card", "UPI", "Cash", "Bank transfer", "Insurance settlement"].map(
              (option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-2.5">
          <AlertTriangle className="size-3.5 shrink-0 text-amber-400" />
          <p className="text-[11px] text-amber-300">{error}</p>
        </div>
      )}

      {valid && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5">
          <Check className="size-3.5 text-emerald-400" />
          <p className="text-[11px] text-emerald-300">
            Balance after payment:{" "}
            {formatINR(Math.max(0, computed.balance - parsed))}
            {computed.balance - parsed < 0.01 && " — invoice fully settled"}
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
          Record payment
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
