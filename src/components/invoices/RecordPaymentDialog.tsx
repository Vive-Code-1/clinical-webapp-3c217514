import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

/** Modal to record a manual payment against an invoice. */
export function RecordPaymentDialog({
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
