import { Link } from "@tanstack/react-router";
import { FileText, Receipt } from "lucide-react";
import { fmtMoney, STATUS_ICON, STATUS_STYLE, type InvoiceRow } from "./types";

/**
 * Main invoices table. Stateless — selection and row-open are wired by the
 * route component.
 */
export function InvoicesTable({
  rows,
  loading,
  clinicId,
  selected,
  onToggleOne,
  onToggleAll,
  onOpen,
}: {
  rows: InvoiceRow[] | undefined;
  loading: boolean;
  clinicId: string;
  selected: Set<string>;
  onToggleOne: (id: string) => void;
  onToggleAll: () => void;
  onOpen: (id: string) => void;
}) {
  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }
  if (!rows || rows.length === 0) {
    return (
      <div className="p-12 text-center">
        <Receipt className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">No invoices yet. Create your first one.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                aria-label="Select all"
                checked={selected.size > 0 && selected.size === rows.length}
                ref={(el) => {
                  if (el) el.indeterminate = selected.size > 0 && selected.size < rows.length;
                }}
                onChange={onToggleAll}
                className="cursor-pointer"
              />
            </th>
            <th className="text-left px-5 py-3 font-medium">Number</th>
            <th className="text-left px-5 py-3 font-medium">Client</th>
            <th className="text-left px-5 py-3 font-medium">Status</th>
            <th className="text-right px-5 py-3 font-medium">Total</th>
            <th className="text-right px-5 py-3 font-medium">Paid</th>
            <th className="text-left px-5 py-3 font-medium">Due</th>
            <th className="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((inv) => {
            const Icon = STATUS_ICON[inv.status] ?? FileText;
            const isSel = selected.has(inv.id);
            return (
              <tr
                key={inv.id}
                onClick={() => onOpen(inv.id)}
                className={`border-t border-border hover:bg-muted/30 cursor-pointer ${isSel ? "bg-primary/5" : ""}`}
              >
                <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${inv.invoice_number}`}
                    checked={isSel}
                    onChange={() => onToggleOne(inv.id)}
                    className="cursor-pointer"
                  />
                </td>
                <td className="px-5 py-3 font-mono text-xs">{inv.invoice_number}</td>
                <td className="px-5 py-3">{inv.client?.full_name ?? "—"}</td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      STATUS_STYLE[inv.status] ?? "bg-muted"
                    }`}
                  >
                    <Icon className="w-3 h-3" /> {inv.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-medium">{fmtMoney(inv.total_cents, inv.currency)}</td>
                <td className="px-5 py-3 text-right text-muted-foreground">
                  {fmtMoney(inv.amount_paid_cents, inv.currency)}
                </td>
                <td className="px-5 py-3 text-muted-foreground text-xs">
                  {inv.due_at ? new Date(inv.due_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    to="/invoices/$invoiceId"
                    params={{ invoiceId: inv.id }}
                    search={{ clinic: clinicId }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary hover:underline text-xs font-medium"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
