import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Reminders } from "./types";

export function RemindersSection({ clinicId }: { clinicId: string }) {
  const reminders = useQuery({
    queryKey: ["reminder-settings", clinicId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("reminder_settings")
        .select("email_enabled, sms_enabled, hours_before, send_confirmations, twilio_from")
        .eq("clinic_id", clinicId)
        .maybeSingle();
      if (error) throw error;
      return (data as Reminders | null) ?? {
        email_enabled: true,
        sms_enabled: false,
        hours_before: 24,
        send_confirmations: true,
        twilio_from: null,
      };
    },
  });

  const [rem, setRem] = useState<Reminders | null>(null);
  useEffect(() => {
    if (reminders.data) setRem(reminders.data);
  }, [reminders.data]);

  const saveReminders = useMutation({
    mutationFn: async () => {
      if (!rem) return;
      const { error } = await (supabase as any).from("reminder_settings").upsert({
        clinic_id: clinicId,
        ...rem,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Saved"),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <section className="rounded-2xl border border-border bg-card card-pop p-6">
      <h2 className="text-lg font-semibold mb-1">Appointment reminders</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Automated email and SMS sent before appointments. SMS requires Twilio (configure when ready).
      </p>
      {rem && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            saveReminders.mutate();
          }}
          className="space-y-4"
        >
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rem.email_enabled}
              onChange={(e) => setRem({ ...rem, email_enabled: e.target.checked })}
              className="rounded"
            />
            Send email reminders
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rem.sms_enabled}
              onChange={(e) => setRem({ ...rem, sms_enabled: e.target.checked })}
              className="rounded"
            />
            Send SMS reminders (requires Twilio)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rem.send_confirmations}
              onChange={(e) => setRem({ ...rem, send_confirmations: e.target.checked })}
              className="rounded"
            />
            Send booking confirmation immediately
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Hours before appointment</span>
            <input
              type="number"
              min={1}
              max={168}
              value={rem.hours_before}
              onChange={(e) => setRem({ ...rem, hours_before: parseInt(e.target.value) || 24 })}
              className="mt-1 w-32 px-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Twilio "from" phone number</span>
            <input
              value={rem.twilio_from ?? ""}
              onChange={(e) => setRem({ ...rem, twilio_from: e.target.value })}
              placeholder="+1 555 123 4567"
              className="mt-1 w-full max-w-xs px-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={saveReminders.isPending}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            {saveReminders.isPending ? "Saving…" : "Save"}
          </button>
        </form>
      )}
    </section>
  );
}
