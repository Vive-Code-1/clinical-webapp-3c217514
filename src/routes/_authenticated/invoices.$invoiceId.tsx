import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/clinic-queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Download, Plus, Send, Mail, CreditCard, Zap } from "lucide-react";
import { createInvoiceCheckout } from "@/lib/billing.functions";
import { chargeInvoiceWithSavedCard } from "@/lib/saved-cards.functions";

const searchSchema = z.object({ clinic: z.string().optional(), checkout: z.string().optional() });

export const Route = createFileRoute("/_authenticated/invoices/$invoiceId")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Invoice — SANTÉ" }] }),
  component: InvoiceDetailPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

const fmtMoney = (cents: number, ccy = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: ccy }).format(cents / 100);

const escapeHtml = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function openInvoicePdf(i: any, clinicName: string, balance: number) {
  const itemsHtml = (i.items ?? [])
    .map(
      (it: any) => `
      <tr>
        <td>${escapeHtml(it.description)}</td>
        <td class="r">${it.quantity}</td>
        <td class="r">${fmtMoney(it.unit_price_cents, i.currency)}</td>
        <td class="r">${(it.tax_rate_bps / 100).toFixed(1)}%</td>
        <td class="r">${fmtMoney(it.line_total_cents, i.currency)}</td>
      </tr>`,
    )
    .join("");
  const paymentsHtml = (i.payments ?? []).length
    ? `<h3>Payment history</h3><table class="t"><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="r">Amount</th></tr></thead><tbody>${i.payments
        .map(
          (p: any) => `<tr><td>${new Date(p.received_at).toLocaleString()}</td><td>${escapeHtml(p.method)}</td><td>${escapeHtml(p.reference ?? "")}</td><td class="r">${fmtMoney(p.amount_cents, i.currency)}</td></tr>`,
        )
        .join("")}</tbody></table>`
    : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(i.invoice_number)}</title>
<style>
  *{box-sizing:border-box} body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111;margin:0;padding:40px;background:#fff}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:20px;margin-bottom:24px}
  .head h1{margin:0;font-size:32px;letter-spacing:-.5px}
  .meta{color:#666;font-size:13px}
  .pill{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:600;text-transform:uppercase;background:#eef;color:#225}
  .pill.paid{background:#e7f7ec;color:#137333}
  .pill.partially_paid{background:#fff3d6;color:#8a5a00}
  .pill.overdue,.pill.void{background:#fde2e2;color:#a4262c}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}
  .label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#666;margin-bottom:4px}
  .due{text-align:right}
  .due .amt{font-size:32px;font-weight:700;margin:4px 0}
  .t{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
  .t th,.t td{padding:10px 8px;border-bottom:1px solid #e4e4e7;text-align:left}
  .t th{font-size:11px;text-transform:uppercase;color:#666}
  .t .r{text-align:right}
  .totals{margin-left:auto;margin-top:14px;width:280px;font-size:13px}
  .totals .row{display:flex;justify-content:space-between;padding:4px 0}
  .totals .grand{font-weight:700;font-size:16px;border-top:2px solid #111;padding-top:8px;margin-top:8px}
  .notes{margin-top:24px;padding:14px;background:#f6f6f7;border-radius:8px;font-size:13px}
  .foot{margin-top:40px;text-align:center;color:#888;font-size:11px}
  h3{font-size:14px;margin:32px 0 8px;text-transform:uppercase;letter-spacing:.05em;color:#444}
  @media print{body{padding:24px}}
</style></head><body>
  <div class="head">
    <div>
      <div class="meta">${escapeHtml(clinicName)}</div>
      <h1>Invoice ${escapeHtml(i.invoice_number)}</h1>
      <div class="meta">${i.issued_at ? `Issued ${new Date(i.issued_at).toLocaleDateString()}` : "Draft"}${i.due_at ? ` · Due ${new Date(i.due_at).toLocaleDateString()}` : ""}</div>
    </div>
    <span class="pill ${escapeHtml(i.status)}">${escapeHtml(String(i.status).replace("_", " "))}</span>
  </div>
  <div class="grid">
    <div>
      <div class="label">Bill to</div>
      <div style="font-weight:600">${escapeHtml(i.client?.full_name ?? "—")}</div>
      <div class="meta">${escapeHtml(i.client?.email ?? "")}</div>
    </div>
    <div class="due">
      <div class="label">Amount due</div>
      <div class="amt">${fmtMoney(balance, i.currency)}</div>
      <div class="meta">of ${fmtMoney(i.total_cents, i.currency)}</div>
    </div>
  </div>
  <table class="t">
    <thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit</th><th class="r">Tax</th><th class="r">Total</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${fmtMoney(i.subtotal_cents, i.currency)}</span></div>
    <div class="row"><span>Tax</span><span>${fmtMoney(i.tax_cents, i.currency)}</span></div>
    <div class="row grand"><span>Total</span><span>${fmtMoney(i.total_cents, i.currency)}</span></div>
    <div class="row" style="color:#137333"><span>Paid</span><span>${fmtMoney(i.amount_paid_cents, i.currency)}</span></div>
    <div class="row grand"><span>Balance</span><span>${fmtMoney(balance, i.currency)}</span></div>
  </div>
  ${i.notes ? `<div class="notes"><div class="label">Notes</div>${escapeHtml(i.notes)}</div>` : ""}
  ${paymentsHtml}
  <div class="foot">Thank you for your business.</div>
  <script>window.onload=()=>{setTimeout(()=>window.print(),200)}</script>
</body></html>`;
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) {
    toast.error("Please allow pop-ups to download the PDF");
    return;
  }
  w.document.write(html);
  w.document.close();
}

function InvoiceDetailPage() {
  const { clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const { invoiceId } = Route.useParams();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const queryClient = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const navigate = Route.useNavigate();
  const checkoutStripe = useServerFn(createInvoiceCheckout);
  const chargeSaved = useServerFn(chargeInvoiceWithSavedCard);
  const [payingStripe, setPayingStripe] = useState(false);
  const [chargingSaved, setChargingSaved] = useState(false);

  const savedCard = useQuery({
    queryKey: ["invoice-saved-card", invoiceId],
    queryFn: async () => {
      const inv = await (supabase as any)
        .from("invoices")
        .select("client_id, clinic_id")
        .eq("id", invoiceId)
        .single();
      if (!inv.data?.client_id) return null;
      const { data } = await (supabase as any)
        .from("saved_payment_methods")
        .select("id, brand, last4, is_default")
        .eq("clinic_id", inv.data.clinic_id)
        .eq("client_id", inv.data.client_id)
        .eq("is_default", true)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (search.checkout === "success") {
      toast.success("Payment received — refreshing invoice.");
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      navigate({ search: (p: z.infer<typeof searchSchema>) => ({ ...p, checkout: undefined }), replace: true });
    } else if (search.checkout === "cancelled") {
      toast.info("Checkout cancelled.");
      navigate({ search: (p: z.infer<typeof searchSchema>) => ({ ...p, checkout: undefined }), replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.checkout]);

  const payWithStripe = async () => {
    try {
      setPayingStripe(true);
      const res = await checkoutStripe({ data: { invoiceId } });
      if (res?.url) window.location.href = res.url;
    } catch (e: any) {
      toast.error(e.message ?? "Could not start Stripe checkout");
    } finally {
      setPayingStripe(false);
    }
  };

  const inv = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const sb: any = supabase;
      const { data, error } = await sb
        .from("invoices")
        .select("*, client:clinic_clients(id, full_name, email), items:invoice_items(*), payments(*)")
        .eq("id", invoiceId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const clinic = clinics.find((c: { id: string }) => c.id === activeClinicId);

  const setStatus = useMutation({
    mutationFn: async (status: string) => {
      const update: any = { status };
      if (status === "sent" && !inv.data?.issued_at) update.issued_at = new Date().toISOString();
      const { error } = await (supabase as any).from("invoices").update(update).eq("id", invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices", activeClinicId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const recordPayment = useMutation({
    mutationFn: async (vars: { amount_cents: number; method: string; reference: string | null }) => {
      const { error } = await (supabase as any).from("payments").insert({
        invoice_id: invoiceId,
        clinic_id: activeClinicId,
        amount_cents: vars.amount_cents,
        method: vars.method,
        reference: vars.reference,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices", activeClinicId] });
      setPayOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (inv.isLoading) {
    return (
      <AppShell clinicId={activeClinicId}>
        <div className="p-8 text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }
  if (!inv.data) {
    return (
      <AppShell clinicId={activeClinicId}>
        <div className="p-8">Invoice not found.</div>
      </AppShell>
    );
  }

  const i = inv.data;
  const balance = i.total_cents - i.amount_paid_cents;

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="p-6 md:p-8 max-w-4xl">
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
                onChange={(e) => setStatus.mutate(e.target.value)}
                disabled={setStatus.isPending}
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
                onClick={() => setStatus.mutate("sent")}
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
                {savedCard.data && (
                  <button
                    onClick={async () => {
                      if (!confirm(`Charge ${savedCard.data.brand} •••• ${savedCard.data.last4} for ${fmtMoney(balance, i.currency)}?`)) return;
                      try {
                        setChargingSaved(true);
                        await chargeSaved({ data: { invoiceId } });
                        toast.success("Payment captured");
                        queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
                        queryClient.invalidateQueries({ queryKey: ["invoices", activeClinicId] });
                      } catch (e: any) {
                        toast.error(e?.message ?? "Charge failed");
                      } finally {
                        setChargingSaved(false);
                      }
                    }}
                    disabled={chargingSaved}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-60"
                    title="Charge saved card on file"
                  >
                    <Zap className="w-4 h-4" /> {chargingSaved ? "Charging…" : `One-click rebill (•••• ${savedCard.data.last4})`}
                  </button>
                )}
                <button
                  onClick={payWithStripe}
                  disabled={payingStripe}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#635bff] text-white text-sm font-medium disabled:opacity-60"
                  title="Pay this invoice with a card via Stripe"
                >
                  <CreditCard className="w-4 h-4" /> {payingStripe ? "Redirecting…" : "Pay with Stripe"}
                </button>
                <button
                  onClick={() => setPayOpen(true)}
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

        {(i.payments ?? []).length > 0 && (
          <div className="mt-6 rounded-2xl border border-border bg-card card-pop overflow-hidden">
            <div className="px-6 py-3 border-b border-border text-sm font-medium">Payment history</div>
            <table className="w-full text-sm">
              <tbody>
                {i.payments.map((p: any) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0">
                    <td className="px-6 py-3 text-muted-foreground text-xs">{new Date(p.received_at).toLocaleString()}</td>
                    <td className="px-6 py-3 capitalize">{p.method}</td>
                    <td className="px-6 py-3 text-muted-foreground text-xs">{p.reference ?? ""}</td>
                    <td className="px-6 py-3 text-right font-medium">{fmtMoney(p.amount_cents, i.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecordPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        balance={balance}
        currency={i.currency}
        submitting={recordPayment.isPending}
        onSubmit={(v) => recordPayment.mutate(v)}
      />
    </AppShell>
  );
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  balance,
  currency,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  balance: number;
  currency: string;
  submitting: boolean;
  onSubmit: (v: { amount_cents: number; method: string; reference: string | null }) => void;
}) {
  const [amount, setAmount] = useState((balance / 100).toFixed(2));
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) {
      toast.error("Invalid amount");
      return;
    }
    onSubmit({ amount_cents: cents, method, reference: reference.trim() || null });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Amount ({currency})</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Method</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background"
            >
              <option value="cash">Cash</option>
              <option value="card">Card (in-person)</option>
              <option value="etransfer">E-Transfer</option>
              <option value="stripe">Stripe</option>
              <option value="insurance">Insurance</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Reference (optional)</span>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background"
              placeholder="Transaction ID, cheque #, …"
            />
          </label>
          <DialogFooter>
            <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
              {submitting ? "Saving…" : "Record"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
