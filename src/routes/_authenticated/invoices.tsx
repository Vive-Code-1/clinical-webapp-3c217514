/**
 * /invoices — list view with bulk actions and a "create invoice" dialog.
 * UI building blocks live in `src/components/invoices/*`.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/queries/clinic";
import { BulkActionsBar } from "@/components/invoices/BulkActionsBar";
import { InvoicesTable } from "@/components/invoices/InvoicesTable";
import { CreateInvoiceDialog, type CreateInvoicePayload } from "@/components/invoices/CreateInvoiceDialog";
import { fmtMoney, type ClientLite, type InvoiceRow, type ServiceLite } from "@/components/invoices/types";

const searchSchema = z.object({ clinic: z.string().optional() });

export const Route = createFileRoute("/_authenticated/invoices")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Invoices — SANTÉ" }] }),
  component: InvoicesPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

function InvoicesPage() {
  const { clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const activeClinic = clinics.find((c: { id: string; name: string }) => c.id === activeClinicId);

  const invoices = useQuery({
    queryKey: ["invoices", activeClinicId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("invoices")
        .select("id, invoice_number, status, currency, total_cents, amount_paid_cents, issued_at, due_at, client_id, client:clinic_clients(full_name, email)")
        .eq("clinic_id", activeClinicId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InvoiceRow[];
    },
  });

  const toggleOne = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () => {
    const all = invoices.data ?? [];
    setSelected((s) => (s.size === all.length ? new Set() : new Set(all.map((i) => i.id))));
  };
  const clearSelection = () => setSelected(new Set());

  const bulkSetStatus = useMutation({
    mutationFn: async (status: string) => {
      const ids = Array.from(selected);
      if (ids.length === 0) return 0;
      const update: any = { status };
      if (status === "sent") update.issued_at = new Date().toISOString();
      const { error } = await (supabase as any).from("invoices").update(update).in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (n) => {
      toast.success(`Updated ${n} invoice(s)`);
      queryClient.invalidateQueries({ queryKey: ["invoices", activeClinicId] });
      clearSelection();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  /** Build a `mailto:` link that BCCs every selected invoice's client. */
  const bulkEmail = () => {
    const rows = (invoices.data ?? []).filter((i) => selected.has(i.id));
    const withEmail = rows.filter((i) => i.client?.email);
    if (withEmail.length === 0) {
      toast.error("None of the selected invoices have a client email");
      return;
    }
    const skipped = rows.length - withEmail.length;
    const emails = Array.from(new Set(withEmail.map((i) => i.client!.email!))).join(",");
    const subject = `Invoices from ${activeClinic?.name ?? ""}`;
    const lines = withEmail
      .map(
        (i) =>
          `• ${i.invoice_number} — ${i.client?.full_name ?? ""} — ${fmtMoney(i.total_cents - i.amount_paid_cents, i.currency)} due`,
      )
      .join("\n");
    const body = `Hello,\n\nPlease find your outstanding invoice(s):\n\n${lines}\n\nThank you,\n${activeClinic?.name ?? ""}`;
    window.location.href = `mailto:?bcc=${encodeURIComponent(emails)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (skipped > 0) toast.warning(`${skipped} invoice(s) skipped — no client email`);
  };

  const clients = useQuery({
    queryKey: ["clients-lite", activeClinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_clients")
        .select("id, full_name")
        .eq("clinic_id", activeClinicId)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as ClientLite[];
    },
  });

  const services = useQuery({
    queryKey: ["services-lite", activeClinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_types")
        .select("id, name, price_cents, currency")
        .eq("clinic_id", activeClinicId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as ServiceLite[];
    },
  });

  const createInvoice = useMutation({
    mutationFn: async (vars: CreateInvoicePayload) => {
      const sb: any = supabase;
      const { data: numData, error: numErr } = await sb.rpc("next_invoice_number", { _clinic_id: activeClinicId });
      if (numErr) throw numErr;
      const { data: inv, error: invErr } = await sb
        .from("invoices")
        .insert({
          clinic_id: activeClinicId,
          client_id: vars.clientId,
          invoice_number: numData,
          status: "draft",
          currency: vars.currency,
          due_at: vars.dueAt,
          notes: vars.notes,
        })
        .select("id")
        .single();
      if (invErr) throw invErr;

      if (vars.items.length > 0) {
        const itemRows = vars.items.map((it, i) => ({
          invoice_id: inv.id,
          service_type_id: it.service_type_id,
          description: it.description,
          quantity: it.quantity,
          unit_price_cents: it.unit_price_cents,
          tax_rate_bps: it.tax_rate_bps,
          line_total_cents: Math.round(it.quantity * it.unit_price_cents),
          position: i,
        }));
        const { error: itemErr } = await sb.from("invoice_items").insert(itemRows);
        if (itemErr) throw itemErr;
        const { error: rpcErr } = await sb.rpc("recalc_invoice_totals", { _invoice_id: inv.id });
        if (rpcErr) throw rpcErr;
      }
      return inv.id as string;
    },
    onSuccess: () => {
      toast.success("Invoice created");
      queryClient.invalidateQueries({ queryKey: ["invoices", activeClinicId] });
      setCreateOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground mt-1 text-sm">Billing, payments & receipts</p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New invoice</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {selected.size > 0 && (
          <BulkActionsBar
            count={selected.size}
            pending={bulkSetStatus.isPending}
            onStatusChange={(s) => bulkSetStatus.mutate(s)}
            onEmail={bulkEmail}
            onClear={clearSelection}
          />
        )}

        <div className="rounded-2xl border border-border bg-card card-pop overflow-hidden">
          <InvoicesTable
            rows={invoices.data}
            loading={invoices.isLoading}
            clinicId={activeClinicId}
            selected={selected}
            onToggleOne={toggleOne}
            onToggleAll={toggleAll}
            onOpen={(id) =>
              navigate({
                to: "/invoices/$invoiceId",
                params: { invoiceId: id },
                search: { clinic: activeClinicId },
              })
            }
          />
        </div>
      </div>

      <CreateInvoiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clients={clients.data ?? []}
        services={services.data ?? []}
        onSubmit={(v) => createInvoice.mutate(v)}
        submitting={createInvoice.isPending}
      />
    </AppShell>
  );
}
