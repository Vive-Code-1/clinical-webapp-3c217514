import { Activity, MessageSquare, ShieldCheck } from "lucide-react";
import { useAppTranslation } from "@/lib/i18n/app-translations";

export function StepsSection() {
  const { t } = useAppTranslation();
  return (
    <section className="px-6 py-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-end mb-14">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">
              {t("landing.steps.eyebrow")}
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
              {t("landing.steps.title")}
            </h2>
          </div>
          <p className="text-lg font-serif text-muted-foreground">{t("landing.steps.body")}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {(["one", "two", "three"] as const).map((k, i) => {
            const Icon = [ShieldCheck, MessageSquare, Activity][i];
            return (
              <div key={k} className="group rounded-3xl bg-card border border-border p-7 hover:-translate-y-1 hover:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-8">
                  <span className="grid place-items-center size-12 rounded-2xl bg-primary/10 text-primary">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t(`landing.steps.items.${k}.step`)}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {t(`landing.steps.items.${k}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground font-serif leading-relaxed">
                  {t(`landing.steps.items.${k}.body`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function TestimonialSection() {
  const { t } = useAppTranslation();
  return (
    <section className="px-6 py-20 bg-accent/40">
      <div className="max-w-4xl mx-auto text-center">
        <div className="flex items-center justify-center gap-1 mb-6 text-primary">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} />
          ))}
        </div>
        <blockquote className="text-2xl md:text-3xl font-serif italic text-foreground leading-snug">
          "{t("landing.testimonial.quote")}"
        </blockquote>
        <div className="mt-8">
          <div className="font-bold text-foreground">{t("landing.testimonial.author")}</div>
          <div className="text-sm text-muted-foreground">{t("landing.testimonial.role")}</div>
        </div>
      </div>
    </section>
  );
}

function Star() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}
