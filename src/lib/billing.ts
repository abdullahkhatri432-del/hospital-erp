import type { Invoice, InvoiceLine } from "@/types";

/**
 * Invoice arithmetic.
 *
 * Money is handled in paise (integer minor units) internally to avoid the
 * floating-point rounding errors that plague currency maths in JavaScript.
 * A value of 0.1 + 0.2 !== 0.3 is a real problem when it is someone's bill.
 */

/** Convert rupees to integer paise. */
function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Convert integer paise back to rupees. */
function toRupees(paise: number): number {
  return paise / 100;
}

export interface InvoiceTotals {
  subtotal: number;
  taxTotal: number;
  total: number;
  paid: number;
  balance: number;
  /** Per-line computed amounts, useful for the printed invoice. */
  lines: {
    line: InvoiceLine;
    lineSubtotal: number;
    lineTax: number;
    lineTotal: number;
  }[];
}

export function calculateInvoice(invoice: Invoice): InvoiceTotals {
  let subtotalPaise = 0;
  let taxPaise = 0;

  const lines = invoice.lines.map((line) => {
    const lineSubtotal = toPaise(line.unitPrice) * line.quantity;
    const lineTax = Math.round((lineSubtotal * line.taxRate) / 100);

    subtotalPaise += lineSubtotal;
    taxPaise += lineTax;

    return {
      line,
      lineSubtotal: toRupees(lineSubtotal),
      lineTax: toRupees(lineTax),
      lineTotal: toRupees(lineSubtotal + lineTax),
    };
  });

  const totalPaise = subtotalPaise + taxPaise;
  const paidPaise = toPaise(invoice.amountPaid);

  return {
    subtotal: toRupees(subtotalPaise),
    taxTotal: toRupees(taxPaise),
    total: toRupees(totalPaise),
    paid: toRupees(paidPaise),
    balance: toRupees(totalPaise - paidPaise),
    lines,
  };
}

/** Derive invoice status from amounts and the due date. */
export function deriveInvoiceStatus(invoice: Invoice): Invoice["status"] {
  const { total, paid } = calculateInvoice(invoice);

  if (paid >= total && total > 0) return "paid";
  if (paid > 0) return "part-paid";
  if (new Date(invoice.dueAt) < new Date()) return "overdue";
  return invoice.status === "draft" ? "draft" : "issued";
}

/** Format as Indian Rupees with lakh/crore grouping. */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Compact form for dashboard tiles: ₹1.2L, ₹3.4Cr. */
export function formatINRCompact(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)}Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}
