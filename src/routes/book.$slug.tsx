import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { format, addMinutes } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Step } from "@/components/booking/Step";
import { DatePicker } from "@/components/booking/DatePicker";
import { ServiceList, PractitionerList } from "@/components/booking/Selectors";
import { SlotGrid } from "@/components/booking/SlotGrid";
import { computeSlots } from "@/components/booking/slots";

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
        .from("public_service_types")
        .select("id, name, duration_minutes, price_cents, currency, color")
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
    queryFn: () =>
      computeSlots({
        clinicId: clinicId!,
        practitionerId: selectedPractitionerId!,
        date: selectedDate!,
        durationMinutes: selectedService!.duration_minutes,
      }),
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
          <ServiceList
            services={services.data}
            selectedId={search.service}
            onSelect={(id) =>
              navigate({ search: { service: id, practitioner: undefined, date: undefined } })
            }
          />
        </Step>

        {selectedService && (
          <Step n={2} title="Choose a practitioner">
            <PractitionerList
              practitioners={practitioners.data}
              isLoading={practitioners.isLoading}
              selectedId={selectedPractitionerId}
              onSelect={(uid) =>
                navigate({
                  search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, practitioner: uid, date: undefined }),
                })
              }
            />
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
            <SlotGrid
              slots={slots.data}
              isLoading={slots.isLoading}
              pending={book.isPending}
              showSignInHint={!authLoading && !userId}
              onPick={(slot) => {
                if (!userId) {
                  navigate({ to: "/auth/sign-in" });
                  return;
                }
                if (confirm(`Book ${format(slot, "EEEE, MMMM d")} at ${format(slot, "HH:mm")}?`)) {
                  book.mutate(slot);
                }
              }}
            />
          </Step>
        )}
      </main>

      <footer className="px-6 py-8 border-t border-border text-center text-xs text-muted-foreground">
        Powered by SANTÉ
      </footer>
    </div>
  );
}
