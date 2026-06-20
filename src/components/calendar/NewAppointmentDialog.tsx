import { useState, type FormEvent } from "react";
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

export function NewAppointmentDialog({ clinicId, open, onOpenChange, initialStart, defaultPractitionerId }: Props) {
  const queryClient = useQueryClient();
  const services = useQuery(clinicServicesQuery(clinicId));
  const practitioners = useQuery(clinicPractitionersQuery(clinicId));

  const [serviceId, setServiceId] = useState("");
  const [practitionerId, setPractitionerId] = useState(defaultPractitionerId ?? "");
  const [start, setStart] = useState(initialStart ? format(initialStart, "yyyy-MM-dd'T'HH:mm") : "");
  const [guestName, setGuestName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const service = services.data?.find((s) => s.id === serviceId);
      if (!service || !practitionerId || !start) throw new Error("Missing fields");
      const startsAt = new Date(start);
      const endsAt = addMinutes(startsAt, service.duration_minutes);

      const { error } = await supabase.from("appointments").insert({
        clinic_id: clinicId,
        practitioner_id: practitionerId,
        service_type_id: serviceId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        guest_name: guestName || null,
        notes: notes || null,
        color: service.color,
        status: "scheduled",
        booking_source: "staff",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment created.");
      queryClient.invalidateQueries({ queryKey: ["appointments", clinicId] });
      onOpenChange(false);
      setServiceId("");
      setGuestName("");
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
      <DialogContent className="max-w-md">
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

          <Field label="Client / guest name">
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Optional"
              className="w-full bg-background border border-input rounded-xl px-3 py-2.5"
            />
          </Field>

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
