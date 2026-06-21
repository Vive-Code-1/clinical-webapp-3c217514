import { useState, useMemo, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clinicServicesQuery, clinicPractitionersQuery } from "@/lib/clinic-queries";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { addMinutes, format } from "date-fns";

type Props = {
  clinicId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialStart?: Date;
  defaultPractitionerId?: string;
};

type ClientLite = { id: string; user_id: string | null; full_name: string; email: string | null; phone: string | null };

export function NewAppointmentDialog({ clinicId, open, onOpenChange, initialStart, defaultPractitionerId }: Props) {
  const queryClient = useQueryClient();
  const services = useQuery(clinicServicesQuery(clinicId));
  const practitioners = useQuery(clinicPractitionersQuery(clinicId));

  const clientsQ = useQuery({
    enabled: open && !!clinicId,
    queryKey: ["clinic-clients-lite", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_clients")
        .select("id, user_id, full_name, email, phone")
        .eq("clinic_id", clinicId)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as ClientLite[];
    },
  });

  const [serviceId, setServiceId] = useState("");
  const [practitionerId, setPractitionerId] = useState(defaultPractitionerId ?? "");
  const [start, setStart] = useState(initialStart ? format(initialStart, "yyyy-MM-dd'T'HH:mm") : "");
  const [clientMode, setClientMode] = useState<"existing" | "guest">("existing");
  const [clientId, setClientId] = useState<string>("");
  const [clientSearch, setClientSearch] = useState("");
  const [guestName, setGuestName] = useState("");
  const [saveAsClient, setSaveAsClient] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clientsQ.data ?? [];
    return (clientsQ.data ?? []).filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q),
    );
  }, [clientsQ.data, clientSearch]);

  const mutation = useMutation({
    mutationFn: async () => {
      const service = services.data?.find((s) => s.id === serviceId);
      if (!service || !practitionerId || !start) throw new Error("Missing fields");
      const startsAt = new Date(start);
      const endsAt = addMinutes(startsAt, service.duration_minutes);

      let resolvedClientRecordId: string | null = null;
      let resolvedGuestName: string | null = null;

      if (clientMode === "existing") {
        const c = (clientsQ.data ?? []).find((x) => x.id === clientId);
        if (!c) throw new Error("Please select a client.");
        resolvedClientRecordId = c.id;
        resolvedGuestName = c.user_id ? null : c.full_name;
      } else {
        if (!guestName.trim()) throw new Error("Please enter a guest name.");
        resolvedGuestName = guestName.trim();
        if (saveAsClient) {
          const { data: created, error: cErr } = await supabase
            .from("clinic_clients")
            .insert({ clinic_id: clinicId, full_name: guestName.trim() })
            .select("id")
            .single();
          if (cErr) throw cErr;
          resolvedClientRecordId = created.id;
        }
      }

      const { error: aErr } = await supabase.from("appointments").insert({
        clinic_id: clinicId,
        practitioner_id: practitionerId,
        service_type_id: serviceId,
        client_id: resolvedClientRecordId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        guest_name: resolvedGuestName,
        notes: notes || null,
        color: service.color,
        status: "scheduled",
        booking_source: "staff",
      });
      if (aErr) throw aErr;
      return { resolvedClientRecordId };
    },
    onSuccess: () => {
      toast.success("Appointment created.");
      queryClient.invalidateQueries({ queryKey: ["appointments", clinicId] });
      queryClient.invalidateQueries({ queryKey: ["clinic-clients", clinicId] });
      queryClient.invalidateQueries({ queryKey: ["clinic-clients-lite", clinicId] });
      onOpenChange(false);
      setServiceId("");
      setClientId("");
      setGuestName("");
      setClientSearch("");
      setNotes("");
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold tracking-tight">New appointment</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Service">
            <select
              required
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2.5"
            >
              <option value="">Choose service…</option>
              {services.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.duration_minutes}min
                </option>
              ))}
            </select>
          </Field>

          <Field label="Practitioner">
            <select
              required
              value={practitionerId}
              onChange={(e) => setPractitionerId(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2.5"
            >
              <option value="">Choose practitioner…</option>
              {practitioners.data?.map((p) => (
                <option key={p.user_id} value={p.user_id}>
                  {p.full_name || "(unnamed)"}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Starts at">
            <input
              type="datetime-local"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2.5"
            />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Client</span>
              <div className="flex gap-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setClientMode("existing")}
                  className={`px-2.5 py-1 rounded-full ${
                    clientMode === "existing" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  Existing
                </button>
                <button
                  type="button"
                  onClick={() => setClientMode("guest")}
                  className={`px-2.5 py-1 rounded-full ${
                    clientMode === "guest" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  New / guest
                </button>
              </div>
            </div>

            {clientMode === "existing" ? (
              <div className="space-y-2">
                <input
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Search by name, email, phone…"
                  className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-sm"
                />
                <div className="max-h-44 overflow-y-auto rounded-xl border border-input divide-y divide-border">
                  {filteredClients.length === 0 && (
                    <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                      {clientsQ.isLoading ? "Loading…" : "No matching clients."}
                    </p>
                  )}
                  {filteredClients.slice(0, 50).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setClientId(c.id)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                        clientId === c.id ? "bg-primary/10" : ""
                      }`}
                    >
                      <p className="font-semibold">{c.full_name}</p>
                      {(c.email || c.phone) && (
                        <p className="text-xs text-muted-foreground">{c.email || c.phone}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Full name"
                  className="w-full bg-background border border-input rounded-xl px-3 py-2.5"
                  required={clientMode === "guest"}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={saveAsClient}
                    onChange={(e) => setSaveAsClient(e.target.checked)}
                  />
                  Also save as a client record
                </label>
              </div>
            )}
          </div>

          <Field label="Notes">
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2.5"
            />
          </Field>

          {error && (
            <div className="text-sm font-medium text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-input hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/10 hover:brightness-110 disabled:opacity-60"
            >
              {mutation.isPending ? "Creating…" : "Create"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">{label}</span>
      {children}
    </label>
  );
}
