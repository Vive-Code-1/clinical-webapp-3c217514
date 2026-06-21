import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Heart, Users as UsersIcon, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field } from "./Field";
import type { Contact } from "./types";

export function OverviewTab({
  clinicId,
  clientId,
  client,
}: {
  clinicId: string;
  clientId: string;
  client: { notes: string | null; tags: string[] };
}) {
  const queryClient = useQueryClient();

  const contacts = useQuery({
    queryKey: ["client-contacts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });

  const medical = useQuery({
    queryKey: ["client-medical", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_medical_info")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [contactOpen, setContactOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  const saveContact = useMutation({
    mutationFn: async (payload: Omit<Contact, "id"> & { id?: string }) => {
      if (payload.id) {
        const { error } = await supabase.from("client_contacts").update({
          relationship: payload.relationship,
          full_name: payload.full_name,
          phone: payload.phone,
          email: payload.email,
          notes: payload.notes,
        }).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_contacts").insert({
          clinic_id: clinicId,
          client_id: clientId,
          relationship: payload.relationship,
          full_name: payload.full_name,
          phone: payload.phone,
          email: payload.email,
          notes: payload.notes,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-contacts", clientId] });
      setContactOpen(false);
      setEditing(null);
      toast.success("Contact saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-contacts", clientId] });
      toast.success("Contact removed");
    },
  });

  const saveMedical = useMutation({
    mutationFn: async (payload: Record<string, string | number | null>) => {
      const { error } = await supabase.from("client_medical_info").upsert(
        {
          clinic_id: clinicId,
          client_id: clientId,
          ...payload,
        },
        { onConflict: "client_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-medical", clientId] });
      toast.success("Medical info saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleMedical = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMedical.mutate({
      allergies: String(fd.get("allergies") || "") || null,
      medications: String(fd.get("medications") || "") || null,
      conditions: String(fd.get("conditions") || "") || null,
      family_history: String(fd.get("family_history") || "") || null,
      lifestyle: String(fd.get("lifestyle") || "") || null,
      blood_type: String(fd.get("blood_type") || "") || null,
      height_cm: fd.get("height_cm") ? Number(fd.get("height_cm")) : null,
      weight_kg: fd.get("weight_kg") ? Number(fd.get("weight_kg")) : null,
    });
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Contacts */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <UsersIcon className="w-4 h-4" /> Contacts
          </h3>
          <button
            onClick={() => {
              setEditing(null);
              setContactOpen(true);
            }}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add contact
          </button>
        </div>
        {contacts.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (contacts.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No contacts on record.</p>
        ) : (
          <ul className="space-y-2">
            {(contacts.data ?? []).map((ct) => (
              <li key={ct.id} className="bg-muted/40 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{ct.full_name}</p>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      {ct.relationship}
                    </p>
                    {(ct.phone || ct.email) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {[ct.phone, ct.email].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {ct.notes && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{ct.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditing(ct);
                        setContactOpen(true);
                      }}
                      className="text-xs px-2 py-1 hover:bg-background rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => confirm(`Remove ${ct.full_name}?`) && removeContact.mutate(ct.id)}
                      className="text-xs px-2 py-1 hover:bg-destructive/10 text-destructive rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Medical */}
      <section>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4" /> Medical info
        </h3>
        {medical.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          <form onSubmit={handleMedical} className="space-y-3 text-sm">
            <Field label="Allergies" name="allergies" defaultValue={medical.data?.allergies ?? ""} textarea />
            <Field label="Medications" name="medications" defaultValue={medical.data?.medications ?? ""} textarea />
            <Field label="Conditions" name="conditions" defaultValue={medical.data?.conditions ?? ""} textarea />
            <Field label="Family history" name="family_history" defaultValue={medical.data?.family_history ?? ""} textarea />
            <Field label="Lifestyle" name="lifestyle" defaultValue={medical.data?.lifestyle ?? ""} textarea />
            <div className="grid grid-cols-3 gap-2">
              <Field label="Blood type" name="blood_type" defaultValue={medical.data?.blood_type ?? ""} />
              <Field label="Height (cm)" name="height_cm" type="number" defaultValue={medical.data?.height_cm ?? ""} />
              <Field label="Weight (kg)" name="weight_kg" type="number" defaultValue={medical.data?.weight_kg ?? ""} />
            </div>
            <button
              type="submit"
              disabled={saveMedical.isPending}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full h-9 px-4 text-sm font-semibold hover:brightness-110 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" /> {saveMedical.isPending ? "Saving…" : "Save medical info"}
            </button>
          </form>
        )}
      </section>

      {/* Internal notes */}
      {client.notes && (
        <section className="md:col-span-2">
          <h3 className="font-semibold mb-2">Internal notes</h3>
          <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-xl p-3">{client.notes}</p>
        </section>
      )}

      <ContactDialog
        open={contactOpen}
        onOpenChange={(o) => {
          setContactOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        onSubmit={(payload) => saveContact.mutate(payload)}
        pending={saveContact.isPending}
      />
    </div>
  );
}

function ContactDialog({
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
