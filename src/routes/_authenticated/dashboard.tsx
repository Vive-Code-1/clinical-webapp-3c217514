import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery, clinicAppointmentsQuery } from "@/lib/clinic-queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) {
      throw redirect({ to: "/onboarding" });
    }
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Dashboard — SANTÉ" }] }),
  component: DashboardPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

function DashboardPage() {
  const { user, clinics } = Route.useRouteContext();
  const activeClinic = clinics[0]!;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAppts = useQuery(
    clinicAppointmentsQuery(activeClinic.id, todayStart.toISOString(), tomorrow.toISOString()),
  );

  const profile = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell clinicId={activeClinic.id}>
      <div className="px-8 py-10 max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          {activeClinic.name}
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
          Bonjour{profile.data?.full_name ? `, ${profile.data.full_name.split(" ")[0]}` : ""}.
        </h1>
        <p className="font-serif text-lg text-muted-foreground mb-10">
          Here's your sanctuary for today.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <Stat label="Appointments today" value={todayAppts.data?.length ?? "—"} />
          <Stat
            label="Confirmed"
            value={todayAppts.data?.filter((a) => a.status === "confirmed" || a.status === "scheduled").length ?? "—"}
          />
          <Stat
            label="Public booking URL"
            value={`/book/${activeClinic.slug}`}
            mono
          />
        </div>

        <div className="bg-card rounded-3xl p-8 ring-1 ring-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-extrabold tracking-tight">Today's schedule</h2>
            <Link
              to="/calendar"
              search={{ clinic: activeClinic.id }}
              className="text-sm font-bold text-primary hover:underline"
            >
              Open calendar →
            </Link>
          </div>
          {todayAppts.data?.length === 0 ? (
            <p className="font-serif text-muted-foreground text-sm">No appointments today. A calm day.</p>
          ) : (
            <ul className="divide-y divide-border">
              {todayAppts.data?.map((a) => (
                <li key={a.id} className="py-3 flex items-center gap-4">
                  <div className="w-1 h-10 rounded-full" style={{ backgroundColor: a.color || a.service?.color || "#7A5C3A" }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{a.service?.name || "Appointment"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {a.client_name || a.guest_name || "Walk-in"}
                    </p>
                  </div>
                  <p className="text-sm font-mono text-muted-foreground">
                    {new Date(a.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="bg-card rounded-2xl p-5 ring-1 ring-border">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
      <p className={`text-2xl font-extrabold ${mono ? "font-mono text-base break-all" : ""}`}>{value}</p>
    </div>
  );
}
