import { type FormEvent } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { ClientRow } from "./types";

export function ClientFormDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ClientRow | null;
  onSubmit: (payload: Partial<ClientRow> & { full_name: string }) => void;
  pending: boolean;
}) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const full_name = String(fd.get("full_name") || "").trim();
    if (!full_name) {
      toast.error("Name is required");
      return;
    }
    const tagsRaw = String(fd.get("tags") || "");
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({
      full_name,
      email: String(fd.get("email") || "").trim() || null,
      phone: String(fd.get("phone") || "").trim() || null,
      date_of_birth: String(fd.get("date_of_birth") || "").trim() || null,
      notes: String(fd.get("notes") || "").trim() || null,
      tags,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit client" : "New client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full name" required>
            <input
              name="full_name"
              required
              defaultValue={editing?.full_name ?? ""}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input
                name="email"
                type="email"
                defaultValue={editing?.email ?? ""}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <Field label="Phone">
              <input
                name="phone"
                defaultValue={editing?.phone ?? ""}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth">
              <input
                name="date_of_birth"
                type="date"
                defaultValue={editing?.date_of_birth ?? ""}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <Field label="Tags (comma separated)">
              <input
                name="tags"
                defaultValue={editing?.tags.join(", ") ?? ""}
                placeholder="vip, follow-up"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
          </div>
          <Field label="Internal notes">
            <textarea
              name="notes"
              rows={4}
              defaultValue={editing?.notes ?? ""}
              placeholder="Allergies, preferences, history…"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </Field>
          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-full text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-5 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {pending ? "Saving…" : editing ? "Save changes" : "Add client"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}
