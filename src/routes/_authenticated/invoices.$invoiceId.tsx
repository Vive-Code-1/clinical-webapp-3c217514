/**
 * /invoices/$invoiceId — single-invoice detail view with status / payment
 * controls, Stripe checkout, one-click rebill on a saved card, and a
 * printable PDF generator. UI/dialogs are in `src/components/invoices/*`.
 */
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Download, Plus, Send, Mail, CreditCard, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/queries/clinic";
import { createInvoiceCheckout } from "@/lib/functions/billing";
import { chargeInvoiceWithSavedCard } from "@/lib/functions/saved-cards";
import { RecordPaymentDialog } from "@/components/invoices/RecordPaymentDialog";
import { openInvoicePdf } from "@/components/invoices/invoicePdf";
import { fmtMoney } from "@/components/invoices/types";

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

  // Default card on file for the invoice's client — powers the one-click rebill button.
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

  // After a Stripe redirect back, surface success/cancel and strip the param.
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
