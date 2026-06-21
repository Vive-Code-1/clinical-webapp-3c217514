import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Rss } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function IcalButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!open || token) return;
    (async () => {
      const { data, error } = await supabase
        .from("profile_ical_tokens")
        .select("token")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return toast.error(error.message);
      if (data?.token) {
        setToken(data.token);
        return;
      }

      const { data: created, error: createError } = await supabase
        .from("profile_ical_tokens")
        .insert({ user_id: userId })
        .select("token")
        .single();
      if (createError) return toast.error(createError.message);
      setToken(created.token);
    })();
  }, [open, token, userId]);

  const url = token ? `${window.location.origin}/api/public/ical/${token}.ics` : "";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 rounded-xl border border-input hover:bg-accent text-sm font-semibold flex items-center gap-2"
        title="Subscribe in Google/Apple Calendar"
      >
        <Rss className="w-4 h-4" />
        <span className="hidden sm:inline">Subscribe</span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl card-pop p-6 w-full max-w-lg space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Subscribe to your calendar</h2>
            <p className="text-sm text-muted-foreground">
              Add this URL to Google Calendar, Apple Calendar, or Outlook to see your appointments
              update automatically. Keep it private — anyone with the link can read your schedule.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={url || "Loading…"}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 bg-muted border border-input rounded-lg px-3 py-2 text-xs font-mono"
              />
              <button
                disabled={!url}
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  toast.success("Copied");
                }}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
              >
                Copy
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Google: Other calendars → From URL · Apple: File → New Calendar Subscription
            </p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl border border-input text-sm font-semibold hover:bg-accent"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
