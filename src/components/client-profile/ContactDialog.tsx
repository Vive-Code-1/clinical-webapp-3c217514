import { type FormEvent } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field } from "./Field";
import type { Contact } from "./types";

export function ContactDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Contact | null;
  onSubmit: (payload: Omit<Contact, "id"> & { id?: string }) => void;
  pending: boolean;
}) {
  const handle = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const full_name = String(fd.get("full_name") || "").trim();
    if (!full_name) return toast.error("Name required");
    onSubmit({
      id: editing?.id,
      relationship: String(fd.get("relationship") || "emergency"),
      full_name,
      phone: String(fd.get("phone") || "").trim() || null,
      email: String(fd.get("email") || "").trim() || null,
      notes: String(fd.get("notes") || "").trim() || null,
    });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit contact" : "New contact"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handle} className="space-y-3">
          <Field label="Full name *" name="full_name" defaultValue={editing?.full_name ?? ""} required />
          <Field label="Relationship" name="relationship" placeholder="emergency, parent, referrer…" defaultValue={editing?.relationship ?? "emergency"} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Phone" name="phone" defaultValue={editing?.phone ?? ""} />
            <Field label="Email" name="email" type="email" defaultValue={editing?.email ?? ""} />
          </div>
          <Field label="Notes" name="notes" textarea defaultValue={editing?.notes ?? ""} />
          <DialogFooter>
            <button
              type="submit"
              disabled={pending}
              className="bg-primary text-primary-foreground rounded-full h-9 px-4 text-sm font-semibold hover:brightness-110 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save contact"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
