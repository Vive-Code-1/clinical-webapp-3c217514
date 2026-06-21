import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { useMemo, useState } from "react";
import { TrendingUp, CalendarCheck, AlertTriangle, Wallet } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/queries/clinic";
import { getClinicReport, type ReportRange } from "@/lib/functions/reports";
import { buildDemoReport, isEmptyReport } from "@/lib/utils/reports-demo";
import { useAppTranslation } from "@/lib/i18n/app-translations";
import { KpiCard, BarChart } from "@/components/reports/Charts";
import { TopServices, TopClients } from "@/components/reports/TopLists";
import { DemoBanner } from "@/components/reports/DemoBanner";

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
      <div className="p-4 sm:p-6 md:p-8 space-y-6 min-w-0">
        <div className="flex items-end justify-between gap-3 flex-wrap">
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

        {report.isLoading && !view && <div className="text-sm text-muted-foreground">{t("app.reports.loading")}</div>}
        {report.isError && !demoActive && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {(report.error as Error).message}
          </div>
        )}

        <DemoBanner
          demoActive={demoActive}
          liveEmpty={liveEmpty}
          demoOverride={demoOverride}
          onToggle={() => setDemoOverride(demoActive ? false : true)}
          texts={{
            sampleBanner: t("app.reports.sampleBanner"),
            sampleBody: t("app.reports.sampleBody"),
            viewLive: t("app.reports.viewLive"),
            showDemo: t("app.reports.showDemo"),
            previewSample: t("app.reports.previewSample"),
          }}
        />

        {view && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                icon={Wallet}
                label={t("app.reports.revenue")}
                value={money(view.revenue.totalCents)}
                sub={t("app.reports.paidInvoices", { count: view.revenue.paidInvoices })}
                tone="emerald"
              />
              <KpiCard
                icon={AlertTriangle}
                label={t("app.reports.outstanding")}
                value={money(view.revenue.outstandingCents)}
                sub={t("app.reports.overdue", { amount: money(view.revenue.overdueCents) })}
                tone="amber"
              />
              <KpiCard
                icon={CalendarCheck}
                label={t("app.reports.appointments")}
                value={String(view.appointments.total)}
                sub={t("app.reports.completedCancelled", { c: view.appointments.completed, x: view.appointments.cancelled })}
                tone="sky"
              />
              <KpiCard
                icon={TrendingUp}
                label={t("app.reports.noShowRate")}
                value={
                  view.appointments.total === 0
                    ? "—"
                    : `${((view.appointments.noShow / view.appointments.total) * 100).toFixed(1)}%`
                }
                sub={t("app.reports.noShows", { count: view.appointments.noShow })}
                tone="rose"
              />
            </div>

            <section className="rounded-2xl border border-border bg-card card-pop p-5 card-interactive min-w-0 overflow-hidden">
              <h2 className="text-sm font-semibold mb-4">{t("app.reports.dailyRevenue")}</h2>
              <BarChart
                data={view.revenue.byDay.map((d) => ({ label: d.date, value: d.cents }))}
                format={(v) => money(v)}
                color="var(--primary)"
              />
            </section>

            <section className="rounded-2xl border border-border bg-card card-pop p-5 card-interactive min-w-0 overflow-hidden">
              <h2 className="text-sm font-semibold mb-4">{t("app.reports.dailyAppointments")}</h2>
              <BarChart
                data={view.appointments.byDay.map((d) => ({ label: d.date, value: d.count }))}
                format={(v) => String(v)}
                color="var(--chart-1)"
              />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <TopServices
                items={view.topServices}
                title={t("app.reports.topServices")}
                emptyLabel={t("app.reports.noData")}
                money={money}
              />
              <TopClients
                items={view.topClients}
                title={t("app.reports.topClients")}
                emptyLabel={t("app.reports.noData")}
                apptsLabel={t("app.reports.appts")}
                money={money}
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
