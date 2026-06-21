import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { useAppTranslation } from "@/lib/i18n/app-translations";

/** Coloured KPI tile used at the top of the dashboard. */
export function StatCard({
  tint,
  icon,
  label,
  value,
  delta,
  down,
}: {
  tint: string;
  icon: ReactNode;
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

/** Card wrapper for chart sections (title + ⋯ menu + children area). */
export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
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

/** Inline legend for the appointment-stats stacked bar chart. */
export function ChartLegend() {
  const { t } = useAppTranslation();
  return (
    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[var(--chart-1)]" /> {t("app.dashboard.clinic")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[var(--chart-3)]" /> {t("app.dashboard.online")}
      </span>
    </div>
  );
}

/** Donut chart breaking patients down by age band. */
export function PatientOverview({ total }: { total: number }) {
  const { t } = useAppTranslation();
  const data = [
    { name: t("app.dashboard.adult"), value: 10, color: "var(--chart-1)" },
    { name: t("app.dashboard.child"), value: 8, color: "var(--chart-4)" },
    { name: t("app.dashboard.teen"), value: 40, color: "var(--chart-1)" },
    { name: t("app.dashboard.older"), value: 12, color: "var(--chart-3)" },
  ];
  return (
    <div className="bg-card rounded-2xl p-5 ring-1 ring-border card-interactive">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{t("app.dashboard.patientOverview")}</h3>
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
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {t("app.dashboard.total")}
            </div>
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
