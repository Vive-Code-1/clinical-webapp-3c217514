import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Plus, Send, Mail, CreditCard, Zap } from "lucide-react";
import { fmtMoney } from "./types";
import { openInvoicePdf } from "./invoicePdf";

type SavedCard = { id: string; brand: string | null; last4: string | null; is_default: boolean } | null;

export function InvoiceDetailCard({
  i,
  clinic,
  activeClinicId,
  balance,
  savedCard,
  payingStripe,
  chargingSaved,
  onPayStripe,
  onChargeSaved,
  onOpenRecord,
  onStatusChange,
  onMarkSent,
  statusPending,
}: {
  i: any;
  clinic: { name: string } | undefined;
  activeClinicId: string;
  balance: number;
  savedCard: SavedCard;
  payingStripe: boolean;
  chargingSaved: boolean;
  onPayStripe: () => void;
  onChargeSaved: () => void;
  onOpenRecord: () => void;
  onStatusChange: (s: string) => void;
  onMarkSent: () => void;
  statusPending: boolean;
}) {
  return (
    <>
      <Link
        to="/invoices"
        search={{ clinic: activeClinicId }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to invoices
      </Link>

      <div className="rounded-3xl bg-card border border-border overflow-hidden">
        <div className="px-8 py-6 border-b border-border flex items-start justify-between bg-muted/20">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{clinic?.name}</div>
            <h1 className="text-2xl font-bold">Invoice {i.invoice_number}</h1>
            <div className="text-sm text-muted-foreground mt-1">
              {i.issued_at ? `Issued ${new Date(i.issued_at).toLocaleDateString()}` : "Draft"}
              {i.due_at && ` · Due ${new Date(i.due_at).toLocaleDateString()}`}
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              i.status === "paid"
                ? "bg-green-100 text-green-800"
                : i.status === "partially_paid"
                ? "bg-amber-100 text-amber-800"
                : i.status === "sent"
                ? "bg-blue-100 text-blue-800"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {i.status.replace("_", " ")}
          </span>
        </div>

        <div className="px-8 py-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-xs uppercase text-muted-foreground mb-1">Bill to</div>
            <div className="font-medium">{i.client?.full_name ?? "—"}</div>
            <div className="text-muted-foreground">{i.client?.email}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-muted-foreground mb-1">Amount due</div>
            <div className="text-3xl font-bold">{fmtMoney(balance, i.currency)}</div>
            <div className="text-muted-foreground text-xs">of {fmtMoney(i.total_cents, i.currency)}</div>
          </div>
        </div>

        <div className="px-8 pb-6">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-2 font-medium">Description</th>
                <th className="text-right py-2 font-medium">Qty</th>
                <th className="text-right py-2 font-medium">Unit</th>
                <th className="text-right py-2 font-medium">Tax</th>
                <th className="text-right py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {(i.items ?? []).map((it: any) => (
                <tr key={it.id} className="border-b border-border/50">
                  <td className="py-3">{it.description}</td>
                  <td className="py-3 text-right">{it.quantity}</td>
                  <td className="py-3 text-right">{fmtMoney(it.unit_price_cents, i.currency)}</td>
                  <td className="py-3 text-right text-muted-foreground">{(it.tax_rate_bps / 100).toFixed(1)}%</td>
                  <td className="py-3 text-right font-medium">{fmtMoney(it.line_total_cents, i.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 ml-auto w-72 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtMoney(i.subtotal_cents, i.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{fmtMoney(i.tax_cents, i.currency)}</span></div>
            <div className="flex justify-between font-bold pt-2 border-t border-border"><span>Total</span><span>{fmtMoney(i.total_cents, i.currency)}</span></div>
            <div className="flex justify-between text-green-700"><span>Paid</span><span>{fmtMoney(i.amount_paid_cents, i.currency)}</span></div>
            <div className="flex justify-between font-bold text-lg"><span>Balance</span><span>{fmtMoney(balance, i.currency)}</span></div>
          </div>

          {i.notes && (
            <div className="mt-6 p-4 rounded-lg bg-muted/40 text-sm">
              <div className="text-xs uppercase text-muted-foreground mb-1">Notes</div>
              {i.notes}
            </div>
          )}
        </div>

        <div className="px-8 py-4 border-t border-border bg-muted/20 flex flex-wrap gap-2 justify-end items-center">
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground mr-auto">
            Status
            <select
              value={i.status}
              onChange={(e) => onStatusChange(e.target.value)}
              disabled={statusPending}
              className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm capitalize"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially paid</option>
              <option value="overdue">Overdue</option>
              <option value="void">Void</option>
            </select>
          </label>
          {i.status === "draft" && (
            <button
              onClick={onMarkSent}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              <Send className="w-4 h-4" /> Mark as sent
            </button>
          )}
          {i.client?.email && (
            <a
              href={`mailto:${i.client.email}?subject=${encodeURIComponent(`Invoice ${i.invoice_number} from ${clinic?.name ?? ""}`)}&body=${encodeURIComponent(`Hello ${i.client.full_name ?? ""},\n\nPlease find your invoice ${i.invoice_number} (total ${fmtMoney(i.total_cents, i.currency)}, balance ${fmtMoney(balance, i.currency)}).\n\nView it here: ${typeof window !== "undefined" ? window.location.href : ""}\n\nThank you,\n${clinic?.name ?? ""}`)}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted"
            >
              <Mail className="w-4 h-4" /> Email to client
            </a>
          )}
          {balance > 0 && i.status !== "void" && (
            <>
              {savedCard && (
                <button
                  onClick={onChargeSaved}
                  disabled={chargingSaved}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-60"
                  title="Charge saved card on file"
                >
                  <Zap className="w-4 h-4" /> {chargingSaved ? "Charging…" : `One-click rebill (•••• ${savedCard.last4})`}
                </button>
              )}
              <button
                onClick={onPayStripe}
                disabled={payingStripe}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#635bff] text-white text-sm font-medium disabled:opacity-60"
                title="Pay this invoice with a card via Stripe"
              >
                <CreditCard className="w-4 h-4" /> {payingStripe ? "Redirecting…" : "Pay with Stripe"}
              </button>
              <button
                onClick={onOpenRecord}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Record payment
              </button>
            </>
          )}
          <button
            onClick={() => openInvoicePdf(i, clinic?.name ?? "", balance)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>
    </>
  );
}

export function PaymentHistory({ payments, currency }: { payments: any[]; currency: string }) {
  if (payments.length === 0) return null;
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card card-pop overflow-hidden">
      <div className="px-6 py-3 border-b border-border text-sm font-medium">Payment history</div>
      <table className="w-full text-sm">
        <tbody>
          {payments.map((p: any) => (
            <tr key={p.id} className="border-b border-border/50 last:border-0">
              <td className="px-6 py-3 text-muted-foreground text-xs">{new Date(p.received_at).toLocaleString()}</td>
              <td className="px-6 py-3 capitalize">{p.method}</td>
              <td className="px-6 py-3 text-muted-foreground text-xs">{p.reference ?? ""}</td>
              <td className="px-6 py-3 text-right font-medium">{fmtMoney(p.amount_cents, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
