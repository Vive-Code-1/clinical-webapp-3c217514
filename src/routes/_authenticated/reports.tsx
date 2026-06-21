import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { useMemo, useState } from "react";
import {
  TrendingUp,
  CalendarCheck,
  AlertTriangle,
  Wallet,
  Users,
  Sparkles,
  Wand2,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/clinic-queries";
import { getClinicReport, type ReportRange } from "@/lib/reports.functions";
import { buildDemoReport, isEmptyReport } from "@/lib/reports-demo";
import { useAppTranslation } from "@/lib/app-translations";

const searchSchema = z.object({
  clinic: z.string().optional(),
  range: z.enum(["7d", "30d", "90d", "1y"]).optional(),
});

export const Route = createFileRoute("/_authenticated/reports")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Reports — Helanthus" }] }),
  component: ReportsPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

const RANGE_IDS: ReportRange[] = ["7d", "30d", "90d", "1y"];

function ReportsPage() {
  const { clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { t } = useAppTranslation();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const range: ReportRange = search.range ?? "30d";
  const fetchReport = useServerFn(getClinicReport);

  const report = useQuery({
    queryKey: ["report", activeClinicId, range],
    queryFn: () => fetchReport({ data: { clinicId: activeClinicId, range } }),
  });

  const liveEmpty = isEmptyReport(report.data);
  const [demoOverride, setDemoOverride] = useState<null | boolean>(null);
  const demoActive = demoOverride ?? liveEmpty;
  const demoData = useMemo(
    () => buildDemoReport(range, report.data?.currency ?? "USD"),
    [range, report.data?.currency],
  );
  const view = demoActive ? demoData : report.data;

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: view?.currency ?? "USD",
      }),
    [view?.currency],
  );
  const money = (cents: number) => fmt.format((cents ?? 0) / 100);

  const rangeLabel = (r: ReportRange) =>
    t(`app.reports.range${r === "7d" ? "7" : r === "30d" ? "30" : r === "90d" ? "90" : "1y"}`);

  const setRange = (r: ReportRange) =>
    navigate({ search: (s: any) => ({ ...s, range: r }), replace: true });

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="p-6 md:p-8 space-y-6 min-w-0">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("app.reports.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("app.reports.subtitle")}
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-border bg-card p-1">
            {RANGE_IDS.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  range === r
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {rangeLabel(r)}
              </button>
            ))}
          </div>
        </div>


        {report.isLoading && !view && <div className="text-sm text-muted-foreground">Loading…</div>}
        {report.isError && !demoActive && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {(report.error as Error).message}
          </div>
        )}

        {demoActive && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3 flex-wrap">
            <Wand2 className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              <span className="font-semibold text-foreground">Showing sample data.</span>{" "}
              <span className="text-muted-foreground">
                Book real appointments and record payments to see live reports here.
              </span>
            </div>
            <button
              onClick={() => setDemoOverride(demoActive ? false : true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
            >
              {liveEmpty && demoOverride !== false ? "View live (empty)" : "Show demo data"}
            </button>
          </div>
        )}
        {!demoActive && !liveEmpty && (
          <div className="flex justify-end">
            <button
              onClick={() => setDemoOverride(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors inline-flex items-center gap-1.5"
            >
              <Wand2 className="w-3.5 h-3.5" /> Preview sample data
            </button>
          </div>
        )}

        {view && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                icon={Wallet}
                label="Revenue collected"
                value={money(view.revenue.totalCents)}
                sub={`${view.revenue.paidInvoices} paid invoices`}
                tone="emerald"
              />
              <KpiCard
                icon={AlertTriangle}
                label="Outstanding"
                value={money(view.revenue.outstandingCents)}
                sub={`${money(view.revenue.overdueCents)} overdue`}
                tone="amber"
              />
              <KpiCard
                icon={CalendarCheck}
                label="Appointments"
                value={String(view.appointments.total)}
                sub={`${view.appointments.completed} completed · ${view.appointments.cancelled} cancelled`}
                tone="sky"
              />
              <KpiCard
                icon={TrendingUp}
                label="No-show rate"
                value={
                  view.appointments.total === 0
                    ? "—"
                    : `${((view.appointments.noShow / view.appointments.total) * 100).toFixed(1)}%`
                }
                sub={`${view.appointments.noShow} no-shows`}
                tone="rose"
              />
            </div>

            <section className="rounded-2xl border border-border bg-card card-pop p-5 card-interactive">
              <h2 className="text-sm font-semibold mb-4">Daily revenue</h2>
              <BarChart
                data={view.revenue.byDay.map((d) => ({ label: d.date, value: d.cents }))}
                format={(v) => money(v)}
                color="var(--primary)"
              />
            </section>

            <section className="rounded-2xl border border-border bg-card card-pop p-5 card-interactive">
              <h2 className="text-sm font-semibold mb-4">Daily appointments</h2>
              <BarChart
                data={view.appointments.byDay.map((d) => ({ label: d.date, value: d.count }))}
                format={(v) => String(v)}
                color="var(--chart-1)"
              />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <section className="rounded-2xl border border-border bg-card card-pop p-5 card-interactive">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Top services</h2>
                </div>
                {view.topServices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {view.topServices.map((s) => (
                      <li key={s.name} className="py-2 flex items-center justify-between gap-3">
                        <span className="text-sm truncate">{s.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {s.count} · {money(s.revenueCents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-border bg-card card-pop p-5 card-interactive">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Top clients</h2>
                </div>
                {view.topClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {view.topClients.map((c) => (
                      <li key={c.id} className="py-2 flex items-center justify-between gap-3">
                        <span className="text-sm truncate">{c.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {c.appointments} appts · {money(c.spentCents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  tone: "emerald" | "amber" | "sky" | "rose";
}) {
  const toneClass = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    sky: "bg-sky-100 text-sky-700",
    rose: "bg-rose-100 text-rose-700",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card card-pop p-5 card-interactive">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
          {label}
        </span>
        <span className={`grid place-items-center w-8 h-8 rounded-lg ${toneClass}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function BarChart({
  data,
  format,
  color,
}: {
  data: { label: string; value: number }[];
  format: (v: number) => string;
  color: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-1 w-full min-w-0">
      <div className="flex items-end gap-px h-40 w-full min-w-0 overflow-hidden">
        {data.map((d) => (
          <div
            key={d.label}
            className="flex-1 min-w-0 rounded-t group relative"
            style={{
              height: `${(d.value / max) * 100}%`,
              background: color,
              opacity: d.value === 0 ? 0.15 : 1,
            }}
            title={`${d.label}: ${format(d.value)}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
