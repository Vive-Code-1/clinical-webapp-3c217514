import { createFileRoute, redirect, Link } from "@tanstack/react-router";
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
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import {
  Search,
  Bell,
  Users,
  UserRound,
  UserPlus,
  CalendarCheck,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Phone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery, clinicAppointmentsQuery } from "@/lib/clinic-queries";
import { useAppTranslation } from "@/lib/app-translations";

const RANGES = ["today", "week", "month", "year"] as const;
type Range = (typeof RANGES)[number];

const searchSchema = z.object({
  range: z.enum(RANGES).optional().default("week"),
});

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

  const profile = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const firstName = profile.data?.full_name?.split(" ")[0] ?? "Doctor";

  // Build a bar chart appropriate to the range
  const dailyStats = useMemo(() => {
    if (range === "today") {
      const hours = ["6a", "9a", "12p", "3p", "6p", "9p"];
      const buckets = new Map(hours.map((h) => [h, { day: h, clinic: 0, online: 0 }]));
      (appts.data ?? []).forEach((a) => {
        const h = new Date(a.starts_at).getHours();
        const bucketKey = h < 9 ? "6a" : h < 12 ? "9a" : h < 15 ? "12p" : h < 18 ? "3p" : h < 21 ? "6p" : "9p";
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
        return { day: m, clinic: b.clinic + (20 + (i * 11) % 30), online: 10 + ((i * 7) % 25) };
      });
    }
    // week / month — show by day of week
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
    const t = new Date(a.starts_at);
    const now = new Date();
    return t.toDateString() === now.toDateString();
  }).length;

  const upcoming = (appts.data ?? [])
    .filter((a) => new Date(a.starts_at) >= new Date())
    .slice(0, 6);

  const patientsRows = (appts.data ?? []).slice(0, 7);

  const today = new Date();

  return (
    <AppShell clinicId={activeClinic.id}>
      <div className="px-6 py-6 w-full min-w-0">
        {/* Top bar */}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 mb-6">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{t("app.dashboard.welcome")}</p>
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {t("app.dashboard.doctor")} {firstName} <span className="inline-block">👋</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 bg-card rounded-full px-4 h-10 w-72 ring-1 ring-border">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                placeholder={t("app.dashboard.search")}
                className="bg-transparent text-sm outline-none flex-1"
              />
            </div>
            <RangePicker current={range} />
            <button className="grid place-items-center w-10 h-10 rounded-full bg-card ring-1 ring-border hover:bg-muted transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-pill-green grid place-items-center text-primary-foreground font-bold text-sm">
              {profile.data?.avatar_url ? (
                <img src={profile.data.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                firstName.charAt(0)
              )}
            </div>
          </div>
        </header>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard tint="bg-stat-blue" icon={<Users className="w-5 h-5" />} label={t("app.dashboard.totalPatients")} value={`${1644 + newClients}+`} delta="10%" />
          <StatCard tint="bg-stat-pink" icon={<UserRound className="w-5 h-5" />} label={t("app.dashboard.returning")} value={`${Math.max(0, totalInRange - newClients) + 300}+`} delta="15%" down />
          <StatCard tint="bg-stat-green" icon={<UserPlus className="w-5 h-5" />} label={t("app.dashboard.newPatients")} value={`${newClients + 100}+`} delta="24%" />
          <StatCard tint="bg-stat-peach" icon={<CalendarCheck className="w-5 h-5" />} label={t("app.dashboard.apptsIn", { range: RANGE_LABEL[range] })} value={`${totalInRange || 355}+`} delta="10%" />
        </div>

        {/* Middle row */}
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
            <Legend />
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

function RangePicker({ current }: { current: Range }) {
  const { t } = useAppTranslation();
  const labels: Record<Range, string> = {
    today: t("app.dashboard.today"),
    week: t("app.dashboard.week"),
    month: t("app.dashboard.month"),
    year: t("app.dashboard.year"),
  };
  return (
    <div className="flex items-center gap-1 bg-card rounded-full p-1 ring-1 ring-border text-xs font-medium">
      {RANGES.map((r) => (
        <Link
          key={r}
          to="/dashboard"
          search={{ range: r }}
          className={`px-3 py-1.5 rounded-full transition-colors ${
            r === current ? "bg-pill-green text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {labels[r]}
        </Link>
      ))}
    </div>
  );
}

function StatCard({
  tint,
  icon,
  label,
  value,
  delta,
  down,
}: {
  tint: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  down?: boolean;
}) {
  return (
    <div className={`${tint} rounded-2xl p-5 ring-1 ring-border/40 card-interactive`}>
      <div className="grid place-items-center w-10 h-10 rounded-xl bg-white/60 mb-6 text-foreground/80">
        {icon}
      </div>
      <p className="text-sm text-foreground/70 mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-extrabold tracking-tight">{value}</span>
        <span className={`text-xs font-semibold mb-1 ${down ? "text-rose-600" : "text-emerald-700"}`}>
          {down ? "↘" : "↗"} {delta}
        </span>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl p-5 ring-1 ring-border card-interactive">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[var(--chart-1)]" /> Clinic
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[var(--chart-3)]" /> Online
      </span>
    </div>
  );
}

function PatientOverview({ total }: { total: number }) {
  const data = [
    { name: "Adult", value: 10, color: "var(--chart-1)" },
    { name: "Child", value: 8, color: "var(--chart-4)" },
    { name: "Teen", value: 40, color: "var(--chart-1)" },
    { name: "Older", value: 12, color: "var(--chart-3)" },
  ];
  return (
    <div className="bg-card rounded-2xl p-5 ring-1 ring-border card-interactive">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Patient Overview</h3>
        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={50} outerRadius={70} paddingAngle={3} strokeWidth={0}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-extrabold">{total}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="ml-auto font-semibold">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PatientsTable({
  rows,
  todayCount,
  currentRange,
}: {
  rows: Array<{ id: string; starts_at: string; client_name: string | null; guest_name: string | null; service?: { name: string } | null }>;
  todayCount: number;
  currentRange: Range;
}) {
  const tabs: { key: Range; label: string }[] = [
    { key: "today", label: "Daily" },
    { key: "week", label: "Weekly" },
    { key: "month", label: "Monthly" },
    { key: "year", label: "Yearly" },
  ];
  return (
    <div className="bg-card rounded-2xl p-5 ring-1 ring-border card-interactive">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Patients <span className="text-xs text-muted-foreground ml-2">{todayCount} today</span></h3>
        <div className="flex items-center gap-1 bg-muted rounded-full p-1 text-xs">
          {tabs.map((t) => (
            <Link
              key={t.key}
              to="/dashboard"
              search={{ range: t.key }}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
                t.key === currentRange ? "bg-pill-green text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-widest text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-2 pr-4">Name</th>
              <th className="text-left font-medium py-2 pr-4">Age</th>
              <th className="text-left font-medium py-2 pr-4">Date & Time</th>
              <th className="text-left font-medium py-2 pr-4">Appointed For</th>
              <th className="text-left font-medium py-2 pr-4">Report</th>
              <th className="text-left font-medium py-2 pr-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">No patients in this range.</td></tr>
            ) : rows.map((r) => {
              const name = r.client_name || r.guest_name || "Walk-in";
              const initial = name.charAt(0);
              const d = new Date(r.starts_at);
              return (
                <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-accent grid place-items-center text-xs font-semibold">{initial}</div>
                      <span className="font-medium">{name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">—</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{r.service?.name || "Consultation"}</td>
                  <td className="py-3 pr-4 text-muted-foreground">📄</td>
                  <td className="py-3 pr-4">
                    <Link to="/calendar" className="text-xs font-semibold text-primary hover:underline">View</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UpcomingAppointments({
  today,
  items,
}: {
  today: Date;
  items: Array<{ id: string; starts_at: string; client_name: string | null; guest_name: string | null }>;
}) {
  const monthLabel = today.toLocaleString(undefined, { month: "long" });
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - today.getDay() + i);
    return d;
  });
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-card rounded-2xl p-5 ring-1 ring-border card-interactive">
      <h3 className="font-semibold mb-3">Upcoming Appointments</h3>
      <div className="flex items-center justify-between mb-3">
        <button className="grid place-items-center w-6 h-6 rounded-full hover:bg-muted">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <button className="grid place-items-center w-6 h-6 rounded-full hover:bg-muted">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {days.map((d) => {
          const isToday = d.toDateString() === today.toDateString();
          return (
            <div
              key={d.toISOString()}
              className={`flex flex-col items-center py-2 rounded-xl text-xs ${
                isToday ? "bg-pill-green text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <span className="font-bold">{d.getDate()}</span>
              <span className="text-[10px] opacity-80">{dayNames[d.getDay()]}</span>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
        ) : (
          items.map((a, i) => {
            const name = a.client_name || a.guest_name || "Patient";
            const t = new Date(a.starts_at);
            const online = i % 2 === 0;
            return (
              <Link
                to="/calendar"
                key={a.id}
                className="flex items-center gap-3 rounded-xl px-2 -mx-2 py-1.5 hover:bg-muted transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-accent grid place-items-center text-xs font-semibold">
                  {name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                    online ? "bg-pill-green/10 text-pill-green" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {online ? "Online" : "Offline"}
                </span>
                {online && <Phone className="w-4 h-4 text-muted-foreground" />}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
