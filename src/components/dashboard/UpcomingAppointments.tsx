import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { useAppTranslation } from "@/lib/i18n/app-translations";

type Item = {
  id: string;
  starts_at: string;
  client_name: string | null;
  guest_name: string | null;
};

/**
 * Right-rail mini calendar (current week) + list of upcoming appointments.
 */
export function UpcomingAppointments({
  today,
  items,
}: {
  today: Date;
  items: Item[];
}) {
  const { t, i18n } = useAppTranslation();
  const locale = i18n.resolvedLanguage ?? "en";
  const monthLabel = today.toLocaleString(locale, { month: "long" });
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - today.getDay() + i);
    return d;
  });

  return (
    <div className="bg-card rounded-2xl p-5 ring-1 ring-border card-interactive">
      <h3 className="font-semibold mb-3">{t("app.dashboard.upcoming")}</h3>
      <div className="flex items-center justify-between mb-3">
        <button className="grid place-items-center w-6 h-6 rounded-full hover:bg-muted">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium capitalize">{monthLabel}</span>
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
              <span className="text-[10px] opacity-80 capitalize">
                {d.toLocaleDateString(locale, { weekday: "short" })}
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("app.dashboard.noUpcoming")}</p>
        ) : (
          items.map((a, i) => {
            const name = a.client_name || a.guest_name || t("app.dashboard.patient");
            const time = new Date(a.starts_at);
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
                    {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                    online ? "bg-pill-green/10 text-pill-green" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {online ? t("app.dashboard.online") : t("app.dashboard.offline")}
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
