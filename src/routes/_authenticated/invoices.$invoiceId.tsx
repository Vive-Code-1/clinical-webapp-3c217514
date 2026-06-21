/**
 * /invoices/$invoiceId — single-invoice detail view with status / payment
 * controls, Stripe checkout, one-click rebill on a saved card, and a
 * printable PDF generator. UI/dialogs are in `src/components/invoices/*`.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/queries/clinic";
import { createInvoiceCheckout } from "@/lib/functions/billing";
import { chargeInvoiceWithSavedCard } from "@/lib/functions/saved-cards";
import { RecordPaymentDialog } from "@/components/invoices/RecordPaymentDialog";
import { fmtMoney } from "@/components/invoices/types";
import { InvoiceDetailCard, PaymentHistory } from "@/components/invoices/InvoiceDetailCard";

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

  const onChargeSaved = async () => {
    if (!savedCard.data) return;
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
  };

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="p-6 md:p-8 max-w-4xl">
        <InvoiceDetailCard
          i={i}
          clinic={clinic}
          activeClinicId={activeClinicId}
          balance={balance}
          savedCard={savedCard.data ?? null}
          payingStripe={payingStripe}
          chargingSaved={chargingSaved}
          onPayStripe={payWithStripe}
          onChargeSaved={onChargeSaved}
          onOpenRecord={() => setPayOpen(true)}
          onStatusChange={(s) => setStatus.mutate(s)}
          onMarkSent={() => setStatus.mutate("sent")}
          statusPending={setStatus.isPending}
        />

        <PaymentHistory payments={i.payments ?? []} currency={i.currency} />
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
