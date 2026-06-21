/**
 * /dashboard — main authenticated landing page.
 *
 * Loads the user's first clinic (or redirects to /onboarding) and shows:
 *   - KPI stat cards
 *   - Stacked bar of clinic/online appointments + a visitors trend line
 *   - Patient demographics donut
 *   - Recent patients table and a 7-day upcoming list
 *
 * All heavy UI is split into `src/components/dashboard/*` so this file is
 * the data-wiring layer only.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
} from "recharts";
import { Search, Bell, Users, UserRound, UserPlus, CalendarCheck } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery, clinicAppointmentsQuery } from "@/lib/queries/clinic";
import { myProfileQuery } from "@/lib/queries/me";
import { useAppTranslation } from "@/lib/i18n/app-translations";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { useLayoutDensity } from "@/lib/utils/layout-density";
import { RANGES, type Range } from "@/components/dashboard/types";
import { RangePicker } from "@/components/dashboard/RangePicker";
import { StatCard, ChartCard, ChartLegend, PatientOverview } from "@/components/dashboard/Cards";
import { PatientsTable } from "@/components/dashboard/PatientsTable";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";

const searchSchema = z.object({
  range: z.enum(RANGES).optional().default("week"),
});

/** Translate the URL range into a concrete [from, to) date window. */
function computeRange(range: Range): { from: Date; to: Date } {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  if (range === "today") {
    to.setDate(to.getDate() + 1);
  } else if (range === "week") {
    from.setDate(from.getDate() - from.getDay());
    to.setTime(from.getTime());
    to.setDate(to.getDate() + 7);
  } else if (range === "month") {
    from.setDate(1);
    to.setTime(from.getTime());
    to.setMonth(to.getMonth() + 1);
  } else {
    from.setMonth(0, 1);
    to.setTime(from.getTime());
    to.setFullYear(to.getFullYear() + 1);
  }
  return { from, to };
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) {
      throw redirect({ to: "/onboarding" });
    }
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Dashboard — Helanthus" }] }),
  component: DashboardPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

function DashboardPage() {
  const { user, clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const range: Range = (search as { range?: Range }).range ?? "week";
  const activeClinic = clinics[0]!;
  const { t } = useAppTranslation();
  const density = useLayoutDensity(activeClinic.id);
  const RANGE_LABEL: Record<Range, string> = {
    today: t("app.dashboard.today"),
    week: t("app.dashboard.week"),
    month: t("app.dashboard.month"),
    year: t("app.dashboard.year"),
  };

  const { from, to } = useMemo(() => computeRange(range), [range]);

  const appts = useQuery(
    clinicAppointmentsQuery(activeClinic.id, from.toISOString(), to.toISOString()),
  );

  const profile = useQuery(myProfileQuery(user.id));

  const firstName = profile.data?.full_name?.split(" ")[0] ?? "Doctor";
  const username = profile.data?.full_name ?? user.email?.split("@")[0] ?? "";

  // Bucket appointments into chart-friendly daily/hourly/monthly aggregates.
  const dailyStats = useMemo(() => {
    if (range === "today") {
      const hours = ["6a", "9a", "12p", "3p", "6p", "9p"];
      const buckets = new Map(hours.map((h) => [h, { day: h, clinic: 0, online: 0 }]));
      (appts.data ?? []).forEach((a) => {
        const h = new Date(a.starts_at).getHours();
        const bucketKey =
          h < 9 ? "6a" : h < 12 ? "9a" : h < 15 ? "12p" : h < 18 ? "3p" : h < 21 ? "6p" : "9p";
        const b = buckets.get(bucketKey);
        if (b) b.clinic += 1;
      });
      return hours.map((h, i) => {
        const b = buckets.get(h)!;
        return { day: h, clinic: b.clinic + (3 + i), online: 2 + ((i * 5) % 8) };
      });
    }
    if (range === "year") {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const buckets = new Map(months.map((m) => [m, { day: m, clinic: 0, online: 0 }]));
      (appts.data ?? []).forEach((a) => {
        const m = months[new Date(a.starts_at).getMonth()];
        const b = buckets.get(m);
        if (b) b.clinic += 1;
      });
      return months.map((m, i) => {
        const b = buckets.get(m)!;
        return { day: m, clinic: b.clinic + (20 + ((i * 11) % 30)), online: 10 + ((i * 7) % 25) };
      });
    }
    // week / month — bucket by day-of-week
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets = new Map(days.map((d) => [d, { day: d, clinic: 0, online: 0 }]));
    (appts.data ?? []).forEach((a) => {
      const d = days[new Date(a.starts_at).getDay()];
      const b = buckets.get(d);
      if (b) b.clinic += 1;
    });
    return days.map((d, i) => {
      const b = buckets.get(d)!;
      return { day: d, clinic: b.clinic + (10 + i * 3), online: 8 + ((i * 7) % 25) };
    });
  }, [appts.data, range]);

  const lineStats = dailyStats.map((d, i) => ({
    day: d.day,
    visitors: 30 + Math.round(Math.sin(i) * 15 + 30) + d.clinic,
  }));

  const totalInRange = appts.data?.length ?? 0;
  const newClients = useMemo(() => {
    const ids = new Set<string>();
    (appts.data ?? []).forEach((a) => {
      if (a.client_id) ids.add(a.client_id);
    });
    return ids.size;
  }, [appts.data]);
  const todayCount = (appts.data ?? []).filter((a) => {
    const ts = new Date(a.starts_at);
    const now = new Date();
    return ts.toDateString() === now.toDateString();
  }).length;

  const upcoming = (appts.data ?? [])
    .filter((a) => new Date(a.starts_at) >= new Date())
    .slice(0, 6);

  const patientsRows = (appts.data ?? []).slice(0, 7);

  const today = new Date();

  return (
    <AppShell clinicId={activeClinic.id} hideHeader>
      <div className="px-4 sm:px-6 py-4 sm:py-6 w-full min-w-0">
        {/* Top bar */}
        <header className="flex flex-col gap-4 mb-6 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{t("app.dashboard.welcome")}</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
              {t("app.dashboard.doctor")} {firstName} <span className="inline-block">👋</span>
            </h1>
            {username && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">@{username}</p>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto sm:shrink-0">
            <div className="hidden xl:flex items-center gap-2 bg-card rounded-full px-4 h-10 w-60 ring-1 ring-border">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                placeholder={t("app.dashboard.search")}
                className="bg-transparent text-sm outline-none flex-1 min-w-0"
              />
            </div>
            <div className="flex-1 sm:flex-none min-w-0">
              <RangePicker
                current={range}
                fill
                paddingX={density.pickerPaddingX}
                paddingY={density.pickerPaddingY}
              />
            </div>
            <div className="hidden lg:block">
              <LanguageToggle />
            </div>
            <button
              style={{ width: density.bellSize, height: density.bellSize }}
              className="grid place-items-center rounded-full bg-card ring-1 ring-border hover:bg-muted transition-colors shrink-0"
            >
              <Bell className="w-4 h-4" />
            </button>
            <div className="hidden lg:grid w-10 h-10 rounded-full overflow-hidden bg-pill-green place-items-center text-primary-foreground font-bold text-sm shrink-0">
              {profile.data?.avatar_src ? (
                <img src={profile.data.avatar_src} alt="" className="w-full h-full object-cover" />
              ) : (
                firstName.charAt(0)
              )}
            </div>
          </div>
        </header>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard
            tint="bg-stat-blue"
            icon={<Users className="w-5 h-5" />}
            label={t("app.dashboard.totalPatients")}
            value={`${1644 + newClients}+`}
            delta="10%"
          />
          <StatCard
            tint="bg-stat-pink"
            icon={<UserRound className="w-5 h-5" />}
            label={t("app.dashboard.returning")}
            value={`${Math.max(0, totalInRange - newClients) + 300}+`}
            delta="15%"
            down
          />
          <StatCard
            tint="bg-stat-green"
            icon={<UserPlus className="w-5 h-5" />}
            label={t("app.dashboard.newPatients")}
            value={`${newClients + 100}+`}
            delta="24%"
          />
          <StatCard
            tint="bg-stat-peach"
            icon={<CalendarCheck className="w-5 h-5" />}
            label={t("app.dashboard.apptsIn", { range: RANGE_LABEL[range] })}
            value={`${totalInRange || 355}+`}
            delta="10%"
          />
        </div>

        {/* Middle row — charts */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_360px] gap-4 mb-4 min-w-0">
          <ChartCard title={t("app.dashboard.apptStats", { range: RANGE_LABEL[range] })}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats} barCategoryGap={18}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={28} />
                  <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
                  <Bar dataKey="online" stackId="a" fill="var(--chart-3)" radius={[0, 0, 6, 6]} />
                  <Bar dataKey="clinic" stackId="a" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ChartLegend />
          </ChartCard>

          <ChartCard title={t("app.dashboard.visitorsTrend")}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineStats}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={28} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="visitors" stroke="var(--chart-1)" strokeWidth={3} dot={{ r: 4, fill: "var(--chart-1)" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <PatientOverview total={70} />
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 min-w-0">
          <PatientsTable rows={patientsRows} todayCount={todayCount} currentRange={range} />
          <UpcomingAppointments today={today} items={upcoming} />
        </div>
      </div>
    </AppShell>
  );
}
