import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isPast } from "date-fns";
import { toast } from "sonner";
import { CalendarDays, Clock, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Booking = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  clinic: { id: string; name: string; slug: string; brand_color: string | null } | null;
  service: { name: string; color: string; duration_minutes: number } | null;
  practitioner_id: string;
  practitioner_name: string | null;
};

export const Route = createFileRoute("/_authenticated/my-bookings")({
  ssr: false,
  head: () => ({ meta: [{ title: "My bookings — Helanthus" }] }),
  component: MyBookingsPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

function MyBookingsPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const bookings = useQuery({
    queryKey: ["my-bookings", user.id],
    queryFn: async (): Promise<Booking[]> => {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id, starts_at, ends_at, status, notes, practitioner_id, clinic:clinics(id, name, slug, brand_color), service:service_types(name, color, duration_minutes)",
        )
        .eq("client_id", user.id)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as Omit<Booking, "practitioner_name">[];
      if (rows.length === 0) return [];

      const ids = Array.from(new Set(rows.map((r) => r.practitioner_id)));
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
      return rows.map((r) => ({ ...r, practitioner_name: nameMap.get(r.practitioner_id) ?? null }));
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking cancelled.");
      queryClient.invalidateQueries({ queryKey: ["my-bookings", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const all = bookings.data ?? [];
  const upcoming = all.filter((b) => !isPast(new Date(b.starts_at)) && b.status !== "cancelled");
  const past = all.filter((b) => isPast(new Date(b.starts_at)) || b.status === "cancelled");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Your account</p>
            <h1 className="text-3xl font-extrabold tracking-tight">My bookings</h1>
          </div>
          <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
            Home →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-12">
        <Section title={`Upcoming (${upcoming.length})`}>
          {bookings.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!bookings.isLoading && upcoming.length === 0 && (
            <EmptyState message="No upcoming appointments. Browse a clinic and book a new one." />
          )}
          <div className="space-y-3">
            {upcoming.map((b) => (
              <BookingCard
                key={b.id}
                b={b}
                onCancel={() => {
                  if (confirm("Cancel this appointment?")) cancel.mutate(b.id);
                }}
                cancelling={cancel.isPending && cancel.variables === b.id}
              />
            ))}
          </div>
        </Section>

        <Section title={`Past (${past.length})`}>
          {past.length === 0 && <EmptyState message="Nothing here yet." />}
          <div className="space-y-3">
            {past.map((b) => (
              <BookingCard key={b.id} b={b} />
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-extrabold tracking-tight mb-4">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
      <p className="font-serif text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function BookingCard({
  b,
  onCancel,
  cancelling,
}: {
  b: Booking;
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  const s = new Date(b.starts_at);
  const e = new Date(b.ends_at);
  const brand = b.clinic?.brand_color || b.service?.color || "#7A5C3A";
  const cancelled = b.status === "cancelled" || b.status === "no_show";

  return (
    <article
      className="rounded-2xl bg-card ring-1 ring-border p-5 flex gap-5"
      style={{ borderLeft: `4px solid ${brand}` }}
    >
      <div className="flex flex-col items-center justify-center w-20 shrink-0 border-r border-border pr-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{format(s, "MMM")}</p>
        <p className="text-3xl font-extrabold leading-none">{format(s, "d")}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{format(s, "yyyy")}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-extrabold">{b.service?.name || "Appointment"}</p>
            {b.clinic && (
              <Link
                to="/book/$slug"
                params={{ slug: b.clinic.slug }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {b.clinic.name}
              </Link>
            )}
          </div>
          {cancelled && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-destructive bg-destructive/10 px-2 py-1 rounded-full">
              {b.status}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {format(s, "EEE · HH:mm")} – {format(e, "HH:mm")}
          </span>
          {b.practitioner_name && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {b.practitioner_name}
            </span>
          )}
        </div>
        {b.notes && <p className="text-xs font-serif text-muted-foreground mt-2">{b.notes}</p>}
        {onCancel && !cancelled && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={onCancel}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-60"
            >
              <X className="w-3.5 h-3.5" />
              {cancelling ? "Cancelling…" : "Cancel"}
            </button>
            {b.clinic && (
              <Link
                to="/book/$slug"
                params={{ slug: b.clinic.slug }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-input hover:bg-accent"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Book another
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
