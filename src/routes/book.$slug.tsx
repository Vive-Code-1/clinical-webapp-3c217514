import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { format, addMinutes, addDays, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  service: z.string().optional(),
  practitioner: z.string().optional(),
  date: z.string().optional(),
});

export const Route = createFileRoute("/book/$slug")({
  validateSearch: searchSchema,
  head: ({ params }) => ({
    meta: [
      { title: `Book an appointment — ${params.slug}` },
      { name: "description", content: "Choose a service, practitioner, and time slot." },
    ],
  }),
  component: BookingPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Clinic not found.</div>,
});

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function BookingPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/book/$slug" });

  // Auth state
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthLoading(false);
    });
  }, []);

  const clinic = useQuery({
    queryKey: ["public-clinic", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("id, name, slug, timezone, brand_color, description, logo_url")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const clinicId = clinic.data?.id;

  const services = useQuery({
    enabled: !!clinicId,
    queryKey: ["public-services", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_types")
        .select("id, name, description, duration_minutes, price_cents, currency, color")
        .eq("clinic_id", clinicId!)
        .eq("is_active", true)
        .eq("online_bookable", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedService = services.data?.find((s) => s.id === search.service) ?? null;

  const practitioners = useQuery({
    enabled: !!clinicId && !!selectedService,
    queryKey: ["public-practitioners", clinicId, selectedService?.id],
    queryFn: async () => {
      const { data: ps, error: pErr } = await supabase
        .from("practitioner_services")
        .select("practitioner_id")
        .eq("clinic_id", clinicId!)
        .eq("service_type_id", selectedService!.id);
      if (pErr) throw pErr;
      const ids = (ps ?? []).map((p) => p.practitioner_id);
      if (ids.length === 0) return [];
      const { data: members, error } = await supabase
        .from("public_clinic_members")
        .select("user_id, title, role")
        .eq("clinic_id", clinicId!)
        .eq("is_active", true)
        .in("user_id", ids);
      if (error) throw error;
      return members ?? [];
    },
  });

  const selectedPractitionerId = search.practitioner ?? null;
  const selectedDate = search.date ? new Date(search.date) : null;

  const slots = useQuery({
    enabled: !!selectedPractitionerId && !!selectedDate && !!selectedService && !!clinicId,
    queryKey: ["slots", clinicId, selectedPractitionerId, search.date, selectedService?.id],
    queryFn: async () => {
      const date = selectedDate!;
      const dayCode = DAY_CODES[date.getDay()]!;
      const dayStart = startOfDay(date);
      const dayEnd = addDays(dayStart, 1);

      const [rulesRes, overridesRes, apptsRes] = await Promise.all([
        supabase
          .from("availability_rules")
          .select("start_time, end_time")
          .eq("practitioner_id", selectedPractitionerId!)
          .eq("clinic_id", clinicId!)
          .eq("day_of_week", dayCode)
          .eq("is_active", true),
        supabase
          .from("public_availability_overrides")
          .select("is_closed, start_time, end_time")
          .eq("practitioner_id", selectedPractitionerId!)
          .eq("clinic_id", clinicId!)
          .eq("override_date", format(date, "yyyy-MM-dd")),
        supabase
          .from("appointments")
          .select("starts_at, ends_at, status")
          .eq("practitioner_id", selectedPractitionerId!)
          .gte("starts_at", dayStart.toISOString())
          .lt("starts_at", dayEnd.toISOString()),
      ]);
      if (rulesRes.error) throw rulesRes.error;
      if (overridesRes.error) throw overridesRes.error;
      if (apptsRes.error) throw apptsRes.error;

      const overrides = overridesRes.data ?? [];
      if (overrides.some((o) => o.is_closed)) return [];

      const windows: { start: Date; end: Date }[] = [];
      const pushWindow = (st: string, et: string) => {
        const [sh, sm] = st.split(":").map(Number);
        const [eh, em] = et.split(":").map(Number);
        const s = new Date(date);
        s.setHours(sh!, sm!, 0, 0);
        const e = new Date(date);
        e.setHours(eh!, em!, 0, 0);
        windows.push({ start: s, end: e });
      };
      if (overrides.length > 0) {
        overrides.forEach((o) => o.start_time && o.end_time && pushWindow(o.start_time, o.end_time));
      } else {
        (rulesRes.data ?? []).forEach((r) => pushWindow(r.start_time, r.end_time));
      }

      const busy = (apptsRes.data ?? [])
        .filter((a) => a.status !== "cancelled" && a.status !== "no_show")
        .map((a) => ({ s: new Date(a.starts_at), e: new Date(a.ends_at) }));

      const duration = selectedService!.duration_minutes;
      const now = new Date();
      const generated: Date[] = [];
      for (const w of windows) {
        let t = new Date(w.start);
        while (addMinutes(t, duration) <= w.end) {
          const slotEnd = addMinutes(t, duration);
          const overlaps = busy.some((b) => t < b.e && slotEnd > b.s);
          if (!overlaps && t > now) generated.push(new Date(t));
          t = addMinutes(t, 30);
        }
      }
      return generated;
    },
  });

  const book = useMutation({
    mutationFn: async (slot: Date) => {
      if (!userId) throw new Error("Please sign in to book.");
      const endsAt = addMinutes(slot, selectedService!.duration_minutes);
      const { data: clientRecordId, error: clientError } = await supabase.rpc("ensure_self_client_record", {
        _clinic_id: clinicId!,
      });
      if (clientError) throw clientError;

      const { error } = await supabase.from("appointments").insert({
        clinic_id: clinicId!,
        practitioner_id: selectedPractitionerId!,
        service_type_id: selectedService!.id,
        client_id: clientRecordId,
        starts_at: slot.toISOString(),
        ends_at: endsAt.toISOString(),
        status: "scheduled",
        booking_source: "client_portal",
        color: selectedService!.color,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment booked. We'll see you soon.");
      slots.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (clinic.isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!clinic.data)
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="font-serif text-lg">Clinic not found.</p>
      </div>
    );

  const brand = clinic.data.brand_color || "#7A5C3A";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="px-6 py-8 border-b border-border" style={{ borderTopColor: brand, borderTopWidth: 4 }}>
        <div className="max-w-3xl mx-auto flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Book online</p>
            <h1 className="text-4xl font-extrabold tracking-tight">{clinic.data.name}</h1>
            {clinic.data.description && (
              <p className="font-serif text-muted-foreground mt-3 max-w-prose">{clinic.data.description}</p>
            )}
          </div>
          {userId && (
            <Link
              to="/my-bookings"
              className="text-xs font-bold uppercase tracking-widest text-primary hover:underline whitespace-nowrap"
            >
              My bookings →
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        <Step n={1} title="Choose a service">
          <div className="grid sm:grid-cols-2 gap-3">
            {services.data?.map((s) => {
              const active = s.id === search.service;
              return (
                <button
                  key={s.id}
                  onClick={() =>
                    navigate({ search: { service: s.id, practitioner: undefined, date: undefined } })
                  }
                  className={`text-left p-4 rounded-2xl ring-1 transition-all ${
                    active
                      ? "ring-primary bg-primary/5"
                      : "ring-border bg-card hover:ring-foreground/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-1 h-12 rounded-full mt-1" style={{ backgroundColor: s.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.duration_minutes} min · {(s.price_cents / 100).toFixed(2)} {s.currency}
                      </p>
                      {s.description && (
                        <p className="text-xs font-serif text-muted-foreground mt-2 line-clamp-2">{s.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {services.data?.length === 0 && (
              <p className="font-serif text-muted-foreground text-sm col-span-full">
                No services available for online booking yet.
              </p>
            )}
          </div>
        </Step>

        {selectedService && (
          <Step n={2} title="Choose a practitioner">
            {practitioners.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            <div className="grid sm:grid-cols-3 gap-3">
              {(practitioners.data ?? []).map((p) => {
                const active = p.user_id === search.practitioner;
                return (
                  <button
                    key={p.user_id}
                    onClick={() =>
                      navigate({ search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, practitioner: p.user_id, date: undefined }) })
                    }
                    className={`p-4 rounded-2xl ring-1 transition-all text-left ${
                      active ? "ring-primary bg-primary/5" : "ring-border bg-card hover:ring-foreground/30"
                    }`}
                  >
                    <p className="font-bold">{p.title || (p.role === "owner" ? "Founder" : "Practitioner")}</p>
                    <p className="text-xs text-muted-foreground capitalize">{p.role}</p>
                  </button>
                );
              })}
              {practitioners.data?.length === 0 && (
                <p className="font-serif text-muted-foreground text-sm col-span-full">
                  No practitioner is offering this service yet.
                </p>
              )}
            </div>
          </Step>
        )}

        {selectedService && selectedPractitionerId && (
          <Step n={3} title="Pick a date">
            <DatePicker
              selected={search.date ?? ""}
              onChange={(d) => navigate({ search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, date: d }) })}
            />
          </Step>
        )}

        {selectedService && selectedPractitionerId && selectedDate && (
          <Step n={4} title="Available times">
            {slots.isLoading && <p className="text-sm text-muted-foreground">Loading slots…</p>}
            {slots.data?.length === 0 && (
              <p className="font-serif text-muted-foreground text-sm">
                No openings on this date. Try another day.
              </p>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {slots.data?.map((slot) => (
                <button
                  key={slot.toISOString()}
                  onClick={() => {
                    if (!userId) {
                      navigate({ to: "/auth/sign-in" });
                      return;
                    }
                    if (confirm(`Book ${format(slot, "EEEE, MMMM d")} at ${format(slot, "HH:mm")}?`)) {
                      book.mutate(slot);
                    }
                  }}
                  disabled={book.isPending}
                  className="px-3 py-2.5 rounded-xl bg-card ring-1 ring-border hover:ring-primary text-sm font-mono font-bold transition-all disabled:opacity-60"
                >
                  {format(slot, "HH:mm")}
                </button>
              ))}
            </div>
            {!authLoading && !userId && (
              <p className="mt-4 text-sm font-serif text-muted-foreground">
                You'll be asked to{" "}
                <Link to="/auth/sign-in" className="font-bold text-primary underline">
                  sign in
                </Link>{" "}
                before confirming.
              </p>
            )}
          </Step>
        )}
      </main>

      <footer className="px-6 py-8 border-t border-border text-center text-xs text-muted-foreground">
        Powered by SANTÉ
      </footer>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span
          className="w-7 h-7 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center text-xs font-extrabold"
          aria-hidden
        >
          {n}
        </span>
        <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function DatePicker({ selected, onChange }: { selected: string; onChange: (d: string) => void }) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {days.map((d) => {
        const iso = format(d, "yyyy-MM-dd");
        const active = iso === selected;
        return (
          <button
            key={iso}
            onClick={() => onChange(iso)}
            className={`flex-shrink-0 w-16 py-3 rounded-2xl ring-1 transition-all text-center ${
              active ? "ring-primary bg-primary/5" : "ring-border bg-card hover:ring-foreground/30"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {format(d, "EEE")}
            </p>
            <p className="text-lg font-extrabold">{format(d, "d")}</p>
            <p className="text-[10px] text-muted-foreground">{format(d, "MMM")}</p>
          </button>
        );
      })}
    </div>
  );
}
