import { Link } from "@tanstack/react-router";
import { useAppTranslation } from "@/lib/i18n/app-translations";
import type { Range } from "./types";

type Row = {
  id: string;
  starts_at: string;
  client_name: string | null;
  guest_name: string | null;
  service?: { name: string } | null;
};

/**
 * Recent / upcoming patient list with day/week/month/year tab filter
 * (the tabs simply re-link to /dashboard?range=…).
 */
export function PatientsTable({
  rows,
  todayCount,
  currentRange,
}: {
  rows: Row[];
  todayCount: number;
  currentRange: Range;
}) {
  const { t } = useAppTranslation();
  const tabs: { key: Range; label: string }[] = [
    { key: "today", label: t("app.dashboard.daily") },
    { key: "week", label: t("app.dashboard.weekly") },
    { key: "month", label: t("app.dashboard.monthly") },
    { key: "year", label: t("app.dashboard.yearly") },
  ];
  return (
    <div className="bg-card rounded-2xl p-5 ring-1 ring-border card-interactive min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="font-semibold">
          {t("app.dashboard.patients")}{" "}
          <span className="text-xs text-muted-foreground ml-2">
            {t("app.dashboard.todayCount", { count: todayCount })}
          </span>
        </h3>
        <div className="-mx-1 overflow-x-auto">
          <div className="inline-flex items-center gap-1 bg-muted rounded-full p-1 text-xs">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                to="/dashboard"
                search={{ range: tab.key }}
                resetScroll={false}
                className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                  tab.key === currentRange
                    ? "bg-pill-green text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-widest text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-2 pr-4">{t("app.dashboard.name")}</th>
              <th className="text-left font-medium py-2 pr-4">{t("app.dashboard.age")}</th>
              <th className="text-left font-medium py-2 pr-4">{t("app.dashboard.dateTime")}</th>
              <th className="text-left font-medium py-2 pr-4">{t("app.dashboard.appointedFor")}</th>
              <th className="text-left font-medium py-2 pr-4">{t("app.dashboard.report")}</th>
              <th className="text-left font-medium py-2 pr-4">{t("app.dashboard.action")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                  {t("app.dashboard.noPatients")}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const name = r.client_name || r.guest_name || t("app.dashboard.walkIn");
                const initial = name.charAt(0);
                const d = new Date(r.starts_at);
                return (
                  <tr
                    key={r.id}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-accent grid place-items-center text-xs font-semibold">
                          {initial}
                        </div>
                        <span className="font-medium">{name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">—</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                      {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {r.service?.name || t("app.dashboard.consultation")}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">📄</td>
                    <td className="py-3 pr-4">
                      <Link to="/calendar" className="text-xs font-semibold text-primary hover:underline">
                        {t("app.dashboard.view")}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
