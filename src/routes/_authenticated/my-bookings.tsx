import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isPast } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BookingCard } from "@/components/my-bookings/BookingCard";
import { Section, EmptyState } from "@/components/my-bookings/Section";
import type { Booking } from "@/components/my-bookings/types";

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
          "id, starts_at, ends_at, status, notes, meeting_url, practitioner_id, clinic:clinics(id, name, slug, brand_color), service:service_types(name, color, duration_minutes)",
        )
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
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link to="/messages" className="text-muted-foreground hover:text-foreground">
              Messages
            </Link>
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              Home →
            </Link>
          </div>
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
