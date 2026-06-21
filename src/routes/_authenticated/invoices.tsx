import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/queries/clinic";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Plus, Receipt, CheckCircle2, Clock, AlertCircle, XCircle, Mail, X } from "lucide-react";

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

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  currency: string;
  total_cents: number;
  amount_paid_cents: number;
  issued_at: string | null;
  due_at: string | null;
  client_id: string | null;
  client?: { full_name: string; email: string | null } | null;
};

type ClientLite = { id: string; full_name: string };
type ServiceLite = { id: string; name: string; price_cents: number; currency: string };

const fmtMoney = (cents: number, ccy = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: ccy }).format(cents / 100);

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  partially_paid: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-800",
  void: "bg-gray-200 text-gray-600",
};

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  draft: FileText,
  sent: Clock,
  paid: CheckCircle2,
  partially_paid: AlertCircle,
  overdue: AlertCircle,
  void: XCircle,
};

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
    mutationFn: async (vars: {
      clientId: string | null;
      currency: string;
      dueAt: string | null;
      notes: string | null;
      items: { description: string; quantity: number; unit_price_cents: number; tax_rate_bps: number; service_type_id: string | null }[];
    }) => {
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
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New invoice</span><span className="sm:hidden">New</span>
          </button>
        </div>

        {selected.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <span className="text-muted-foreground text-xs">·</span>
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              Set status
              <select
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  bulkSetStatus.mutate(v);
                  e.currentTarget.value = "";
                }}
                disabled={bulkSetStatus.isPending}
                defaultValue=""
                className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm capitalize"
              >
                <option value="" disabled>Choose…</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="partially_paid">Partially paid</option>
                <option value="overdue">Overdue</option>
                <option value="void">Void</option>
              </select>
            </label>
            <button
              onClick={bulkEmail}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted"
            >
              <Mail className="w-4 h-4" /> Email to clients
            </button>
            <button
              onClick={clearSelection}
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card card-pop overflow-hidden">
          {invoices.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : !invoices.data || invoices.data.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No invoices yet. Create your first one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={selected.size > 0 && selected.size === invoices.data.length}
                      ref={(el) => {
                        if (el) el.indeterminate = selected.size > 0 && selected.size < invoices.data!.length;
                      }}
                      onChange={toggleAll}
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
                {invoices.data.map((inv) => {
                  const Icon = STATUS_ICON[inv.status] ?? FileText;
                  const isSel = selected.has(inv.id);
                  const open = () =>
                    navigate({ to: "/invoices/$invoiceId", params: { invoiceId: inv.id }, search: { clinic: activeClinicId } });
                  return (
                    <tr
                      key={inv.id}
                      onClick={open}
                      className={`border-t border-border hover:bg-muted/30 cursor-pointer ${isSel ? "bg-primary/5" : ""}`}
                    >
                      <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${inv.invoice_number}`}
                          checked={isSel}
                          onChange={() => toggleOne(inv.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="px-5 py-3">{inv.client?.full_name ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[inv.status] ?? "bg-muted"}`}>
                          <Icon className="w-3 h-3" /> {inv.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-medium">{fmtMoney(inv.total_cents, inv.currency)}</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{fmtMoney(inv.amount_paid_cents, inv.currency)}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">
                        {inv.due_at ? new Date(inv.due_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          to="/invoices/$invoiceId"
                          params={{ invoiceId: inv.id }}
                          search={{ clinic: activeClinicId }}
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
          )}
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

function CreateInvoiceDialog({
  open,
  onOpenChange,
  clients,
  services,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clients: ClientLite[];
  services: ServiceLite[];
  onSubmit: (vars: {
    clientId: string | null;
    currency: string;
    dueAt: string | null;
    notes: string | null;
    items: { description: string; quantity: number; unit_price_cents: number; tax_rate_bps: number; service_type_id: string | null }[];
  }) => void;
  submitting: boolean;
}) {
  const [clientId, setClientId] = useState<string>("");
  const [currency, setCurrency] = useState("CAD");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<
    { description: string; quantity: number; unit_price: number; tax_pct: number; service_type_id: string }[]
  >([{ description: "", quantity: 1, unit_price: 0, tax_pct: 0, service_type_id: "" }]);

  const handleAddItem = () =>
    setItems((s) => [...s, { description: "", quantity: 1, unit_price: 0, tax_pct: 0, service_type_id: "" }]);

  const handleRemove = (i: number) => setItems((s) => s.filter((_, idx) => idx !== i));

  const handleServiceChange = (i: number, sid: string) => {
    const svc = services.find((s) => s.id === sid);
    setItems((s) =>
      s.map((it, idx) =>
        idx === i
          ? {
              ...it,
              service_type_id: sid,
              description: svc?.name ?? it.description,
              unit_price: svc ? svc.price_cents / 100 : it.unit_price,
            }
          : it,
      ),
    );
  };

  const subtotal = items.reduce((a, it) => a + it.quantity * it.unit_price * 100, 0);
  const tax = items.reduce((a, it) => a + (it.quantity * it.unit_price * 100 * it.tax_pct) / 100, 0);
  const total = subtotal + tax;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((it) => it.description.trim());
    if (validItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    onSubmit({
      clientId: clientId || null,
      currency,
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      notes: notes.trim() || null,
      items: validItems.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unit_price_cents: Math.round(it.unit_price * 100),
        tax_rate_bps: Math.round(it.tax_pct * 100),
        service_type_id: it.service_type_id || null,
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Client</span>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
              >
                <option value="">— Select —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Currency</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
              >
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Due date</span>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
              />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Line items</span>
              <button type="button" onClick={handleAddItem} className="text-xs text-primary hover:underline">
                + Add item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <select
                    value={it.service_type_id}
                    onChange={(e) => handleServiceChange(i, e.target.value)}
                    className="col-span-3 px-2 py-2 rounded-lg border border-input bg-background text-xs"
                  >
                    <option value="">Custom</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Description"
                    value={it.description}
                    onChange={(e) => setItems((s) => s.map((x, idx) => (idx === i ? { ...x, description: e.target.value } : x)))}
                    className="col-span-4 px-2 py-2 rounded-lg border border-input bg-background text-sm"
                  />
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={it.quantity}
                    onChange={(e) => setItems((s) => s.map((x, idx) => (idx === i ? { ...x, quantity: parseFloat(e.target.value) || 0 } : x)))}
                    className="col-span-1 px-2 py-2 rounded-lg border border-input bg-background text-sm text-right"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price"
                    value={it.unit_price}
                    onChange={(e) => setItems((s) => s.map((x, idx) => (idx === i ? { ...x, unit_price: parseFloat(e.target.value) || 0 } : x)))}
                    className="col-span-2 px-2 py-2 rounded-lg border border-input bg-background text-sm text-right"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Tax %"
                    value={it.tax_pct}
                    onChange={(e) => setItems((s) => s.map((x, idx) => (idx === i ? { ...x, tax_pct: parseFloat(e.target.value) || 0 } : x)))}
                    className="col-span-1 px-2 py-2 rounded-lg border border-input bg-background text-sm text-right"
                  />
                  <button type="button" onClick={() => handleRemove(i)} className="col-span-1 text-xs text-destructive">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(subtotal, currency)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>{fmtMoney(tax, currency)}</span></div>
            <div className="flex justify-between font-bold pt-1 border-t border-border"><span>Total</span><span>{fmtMoney(total, currency)}</span></div>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
          </label>

          <DialogFooter>
            <button type="button" onClick={() => onOpenChange(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
              {submitting ? "Creating…" : "Create invoice"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
