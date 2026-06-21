import { useState, useEffect, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addMinutes, format, differenceInMinutes } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { CalendarAppointment } from "@/lib/queries/clinic";

type Props = {
  clinicId: string;
  appointment: CalendarAppointment | null;
  onOpenChange: (o: boolean) => void;
};

export function AppointmentDetailDialog({ clinicId, appointment, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [start, setStart] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!appointment) return;
    setMode("view");
    setStart(format(new Date(appointment.starts_at), "yyyy-MM-dd'T'HH:mm"));
    setNotes(appointment.notes ?? "");
  }, [appointment?.id]);

  const cancel = useMutation({
    mutationFn: async () => {
      if (!appointment) return;
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment cancelled.");
      queryClient.invalidateQueries({ queryKey: ["appointments", clinicId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reschedule = useMutation({
    mutationFn: async () => {
      if (!appointment) return;
      const duration = differenceInMinutes(new Date(appointment.ends_at), new Date(appointment.starts_at));
      const newStart = new Date(start);
      const newEnd = addMinutes(newStart, duration);
      const { error } = await supabase
        .from("appointments")
        .update({
          starts_at: newStart.toISOString(),
          ends_at: newEnd.toISOString(),
          notes: notes || null,
          status: "scheduled",
        })
        .eq("id", appointment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment updated.");
      queryClient.invalidateQueries({ queryKey: ["appointments", clinicId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    reschedule.mutate();
  };

  const open = !!appointment;
  if (!appointment) return null;

  const s = new Date(appointment.starts_at);
  const e = new Date(appointment.ends_at);
  const cancelled = appointment.status === "cancelled" || appointment.status === "no_show";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold tracking-tight">
            {appointment.service?.name || "Appointment"}
          </DialogTitle>
        </DialogHeader>

        {mode === "view" ? (
          <div className="space-y-4">
            <Row label="When">
              <span className="font-mono text-sm">
                {format(s, "EEE, MMM d · HH:mm")} – {format(e, "HH:mm")}
              </span>
            </Row>
            <Row label="Client">{appointment.client_name || appointment.guest_name || "Walk-in"}</Row>
            <Row label="Practitioner">{appointment.practitioner_name ?? "—"}</Row>
            <Row label="Status">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                  cancelled ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                }`}
              >
                {appointment.status}
              </span>
            </Row>
            {appointment.notes && <Row label="Notes">{appointment.notes}</Row>}
            {appointment.meeting_url && !cancelled && (
              <Row label="Video">
                <a
                  href={`/telehealth/${appointment.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Join video call
                </a>
              </Row>
            )}

            <DialogFooter className="!justify-between gap-2">
              {!cancelled && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Cancel this appointment? The client will see this change.")) cancel.mutate();
                  }}
                  disabled={cancel.isPending}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-60"
                >
                  {cancel.isPending ? "Cancelling…" : "Cancel appointment"}
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-input hover:bg-accent"
                >
                  Close
                </button>
                {!cancelled && (
                  <button
                    type="button"
                    onClick={() => setMode("reschedule")}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/10 hover:brightness-110"
                  >
                    Reschedule
                  </button>
                )}
              </div>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
                New start time
              </span>
              <input
                type="datetime-local"
                required
                value={start}
                onChange={(ev) => setStart(ev.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3 py-2.5"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
                Notes
              </span>
              <textarea
                rows={3}
                value={notes}
                onChange={(ev) => setNotes(ev.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3 py-2.5"
              />
            </label>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setMode("view")}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-input hover:bg-accent"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={reschedule.isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/10 hover:brightness-110 disabled:opacity-60"
              >
                {reschedule.isPending ? "Saving…" : "Save changes"}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground w-24 shrink-0 pt-0.5">
        {label}
      </span>
      <div className="flex-1 text-sm">{children}</div>
    </div>
  );
}
