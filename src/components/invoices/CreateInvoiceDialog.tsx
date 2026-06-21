import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fmtMoney, type ClientLite, type ServiceLite } from "./types";
import { InvoiceLineItemRow, type LineItem } from "./InvoiceLineItemRow";


/** Submit payload — kept identical to the existing route mutation contract. */
export type CreateInvoicePayload = {
  clientId: string | null;
  currency: string;
  dueAt: string | null;
  notes: string | null;
  items: {
    description: string;
    quantity: number;
    unit_price_cents: number;
    tax_rate_bps: number;
    service_type_id: string | null;
  }[];
};

/**
 * Modal form to create an invoice with multiple line items.
 * Pure presentational — parent owns the persistence mutation.
 */
export function CreateInvoiceDialog({
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
  onSubmit: (vars: CreateInvoicePayload) => void;
  submitting: boolean;
}) {
  const [clientId, setClientId] = useState<string>("");
  const [currency, setCurrency] = useState("CAD");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price: 0, tax_pct: 0, service_type_id: "" },
  ]);


  const handleAddItem = () =>
    setItems((s) => [...s, { description: "", quantity: 1, unit_price: 0, tax_pct: 0, service_type_id: "" }]);

  const handleRemove = (i: number) => setItems((s) => s.filter((_, idx) => idx !== i));

  const handlePatch = (i: number, patch: Partial<LineItem>) =>
    setItems((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

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
                <InvoiceLineItemRow
                  key={i}
                  item={it}
                  index={i}
                  services={services}
                  onServiceChange={handleServiceChange}
                  onPatch={handlePatch}
                  onRemove={handleRemove}
                />
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
