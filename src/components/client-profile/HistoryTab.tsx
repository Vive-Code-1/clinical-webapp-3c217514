import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function HistoryTab({
  clinicId,
  client,
}: {
  clinicId: string;
  client: { id: string; user_id: string | null; email: string | null };
}) {
  const history = useQuery({
    queryKey: ["client-appointments-full", clinicId, client.id],
    queryFn: async () => {
      let q = supabase
        .from("appointments")
        .select("id, starts_at, ends_at, status, notes, service:service_types(name, color)")
        .eq("clinic_id", clinicId)
        .order("starts_at", { ascending: false });
      if (client.id) q = q.eq("client_id", client.id);
      else if (client.email) q = q.eq("guest_email", client.email);
      else return [];
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  if (history.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const items = history.data ?? [];
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No appointments on record.</p>;

  return (
    <ul className="divide-y divide-border">
      {items.map((a) => {
        const d = new Date(a.starts_at);
        return (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <div
              className="w-1.5 h-12 rounded-full shrink-0"
              style={{ background: a.service?.color || "var(--pill-green)" }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{a.service?.name || "Appointment"}</p>
              <p className="text-xs text-muted-foreground">
                {d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              {a.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{a.notes}</p>}
            </div>
            <span
              className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                a.status === "cancelled"
                  ? "bg-destructive/10 text-destructive"
                  : a.status === "completed"
                    ? "bg-muted text-muted-foreground"
                    : "bg-pill-green/10 text-pill-green"
              }`}
            >
              {a.status}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
