import { useAppTranslation } from "@/lib/i18n/app-translations";

export function SimplifySection() {
  const { t } = useAppTranslation();
  return (
    <section className="px-6 py-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-start mb-14">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">
              {t("landing.simplify.eyebrow")}
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
              {t("landing.simplify.title")}
            </h2>
          </div>
          <p className="text-lg font-serif text-muted-foreground">{t("landing.simplify.body")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-3xl bg-card border border-border p-6 hover:-translate-y-1 hover:shadow-xl transition-all">
            <h3 className="font-bold text-foreground mb-6">{t("landing.simplify.cards.trend.title")}</h3>
            <div className="flex items-end gap-3 h-32 mb-4">
              {[40, 55, 70, 90, 60, 80, 95].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end">
                  <div className="w-full rounded-md bg-primary" style={{ height: `${h}%` }} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-extrabold text-primary">
                {t("landing.simplify.cards.trend.metric")}
              </span>
              <span className="text-xs text-muted-foreground max-w-[140px] text-right">
                {t("landing.simplify.cards.trend.body")}
              </span>
            </div>
          </div>

          <div className="rounded-3xl bg-card border border-border p-6 hover:-translate-y-1 hover:shadow-xl transition-all">
            <h3 className="font-bold text-foreground mb-4">{t("landing.simplify.cards.updates.title")}</h3>
            <p className="text-sm text-muted-foreground mb-5">{t("landing.simplify.cards.updates.body")}</p>
            <ul className="space-y-3">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary/60 text-sm">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <span className="size-2 rounded-full bg-primary" />
                    Lab result · Dr. Leslie
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">New</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl bg-card border border-border p-6 hover:-translate-y-1 hover:shadow-xl transition-all">
            <h3 className="font-bold text-foreground mb-4">{t("landing.simplify.cards.appointments.title")}</h3>
            <p className="text-sm text-muted-foreground mb-5">{t("landing.simplify.cards.appointments.body")}</p>
            <ul className="space-y-3">
              {[
                { d: "Mon 22", t: "09:00", who: "Blood test" },
                { d: "Tue 23", t: "11:30", who: "Consultation" },
                { d: "Thu 25", t: "15:00", who: "Follow-up" },
              ].map((r) => (
                <li key={r.d} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-border text-sm">
                  <span className="font-semibold text-foreground">{r.who}</span>
                  <span className="text-xs text-muted-foreground">{r.d} · {r.t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
