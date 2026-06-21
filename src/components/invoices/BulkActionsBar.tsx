import { Mail, X } from "lucide-react";

/**
 * Sticky bulk-action bar shown above the invoices table when one or more
 * rows are selected. Pure UI — parent owns the mutation logic.
 */
export function BulkActionsBar({
  count,
  pending,
  onStatusChange,
  onEmail,
  onClear,
}: {
  count: number;
  pending: boolean;
  onStatusChange: (status: string) => void;
  onEmail: () => void;
  onClear: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <span className="text-sm font-medium">{count} selected</span>
      <span className="text-muted-foreground text-xs">·</span>
      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        Set status
        <select
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            onStatusChange(v);
            e.currentTarget.value = "";
          }}
          disabled={pending}
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
        onClick={onEmail}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted"
      >
        <Mail className="w-4 h-4" /> Email to clients
      </button>
      <button
        onClick={onClear}
        className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <X className="w-3 h-3" /> Clear
      </button>
    </div>
  );
}
