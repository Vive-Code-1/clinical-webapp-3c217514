import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, Pencil, Trash2, X, Tag, NotebookPen, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ClientRow, ApptRow } from "./types";

export function ClientDetail({
  client,
  clinicId,
  onEdit,
  onRemove,
  onClose,
}: {
  client: ClientRow | null;
  clinicId: string;
  onEdit: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const history = useQuery({
    enabled: !!client,
    queryKey: ["client-appointments", clinicId, client?.id, client?.user_id, client?.email],
    queryFn: async (): Promise<ApptRow[]> => {
      if (!client) return [];
      let q = supabase
        .from("appointments")
        .select("id, starts_at, ends_at, status, service:service_types(name, color)")
        .eq("clinic_id", clinicId)
        .order("starts_at", { ascending: false })
        .limit(30);
      if (client.id) {
        q = q.eq("client_id", client.id);
      } else if (client.email) {
        q = q.eq("guest_email", client.email);
      } else {
        return [];
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ApptRow[];
    },
  });

  if (!client) {
    return (
      <div className="bg-card rounded-2xl ring-1 ring-border card-pop p-8 text-sm text-muted-foreground text-center hidden xl:block">
        Select a client to view details and booking history.
      </div>
    );
  }

  const initials = client.full_name
    .split(" ")
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="bg-card rounded-2xl ring-1 ring-border card-pop p-5 max-h-[calc(100vh-160px)] overflow-y-auto">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-14 h-14 rounded-full bg-pill-green text-primary-foreground grid place-items-center font-bold text-lg shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-lg truncate">{client.full_name}</h3>
            {client.user_id && (
              <span className="text-[10px] uppercase tracking-widest text-pill-green font-bold">
                Online account
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground xl:hidden">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 mb-4 text-sm">
        {client.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-4 h-4" />
            <a href={`mailto:${client.email}`} className="hover:text-foreground truncate">
              {client.email}
            </a>
          </div>
        )}
        {client.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4" />
            <a href={`tel:${client.phone}`} className="hover:text-foreground">
              {client.phone}
            </a>
          </div>
        )}
        {client.date_of_birth && (
          <div className="text-muted-foreground text-xs">
            DOB: {new Date(client.date_of_birth).toLocaleDateString()}
          </div>
        )}
      </div>

      {client.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {client.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-accent text-foreground/80"
            >
              <Tag className="w-3 h-3" />
              {t}
            </span>
          ))}
        </div>
      )}

      {client.notes && (
        <div className="rounded-xl bg-muted/60 p-3 mb-4">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1.5">
            <NotebookPen className="w-3.5 h-3.5" /> Internal notes
          </div>
          <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      <div className="flex gap-2 mb-5">
        <Link
          to="/clients/$clientId"
          params={{ clientId: client.id }}
          search={{ clinic: clinicId }}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-full h-9 text-sm font-semibold hover:brightness-110"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Open profile
        </Link>
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-2 bg-accent text-foreground rounded-full h-9 px-4 text-sm font-semibold hover:bg-accent/80"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            if (confirm(`Remove ${client.full_name}?`)) onRemove();
          }}
          className="flex items-center justify-center gap-2 bg-destructive/10 text-destructive rounded-full h-9 px-4 text-sm font-semibold hover:bg-destructive/20"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <h4 className="font-semibold text-sm mb-3">Booking history</h4>
      {history.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (history.data ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">No appointments on record.</p>
      ) : (
        <ul className="space-y-2">
          {(history.data ?? []).map((a) => {
            const d = new Date(a.starts_at);
            return (
              <li key={a.id} className="flex items-start gap-3 py-2 border-b border-border/60 last:border-0">
                <div
                  className="w-1 h-10 rounded-full mt-0.5 shrink-0"
                  style={{ background: a.service?.color || "var(--pill-green)" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{a.service?.name || "Appointment"}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                    {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
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
      )}
    </div>
  );
}
