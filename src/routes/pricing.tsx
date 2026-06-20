import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/site/SiteLayout";

const TIERS = ["solo", "clinic", "enterprise"] as const;

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — SANTÉ" },
      {
        name: "description",
        content: "Simple, predictable pricing for solo practitioners and multi-practitioner clinics.",
      },
      { property: "og:title", content: "Pricing — SANTÉ" },
      { property: "og:description", content: "Simple, predictable pricing for modern practices." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { t } = useTranslation();

  return (
    <SiteLayout>
      <section className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center animate-reveal">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-balance text-foreground mb-6">
            {t("pricing.title")}
          </h1>
          <p className="text-xl font-serif text-muted-foreground max-w-2xl mx-auto text-pretty">
            {t("pricing.subtitle")}
          </p>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {TIERS.map((tier, idx) => {
            const features = t(`pricing.tiers.${tier}.features`, { returnObjects: true }) as string[];
            const highlighted = tier === "clinic";
            return (
              <div
                key={tier}
                className={`relative rounded-3xl p-8 flex flex-col animate-reveal ${
                  highlighted
                    ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/20 md:-translate-y-2"
                    : "bg-card text-foreground ring-1 ring-border"
                }`}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                {highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                    {t("pricing.tiers.clinic.highlighted")}
                  </span>
                )}
                <h3 className="text-2xl font-serif italic mb-2">{t(`pricing.tiers.${tier}.name`)}</h3>
                <p className={`text-sm mb-6 ${highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {t(`pricing.tiers.${tier}.description`)}
                </p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-extrabold tracking-tight">{t(`pricing.tiers.${tier}.price`)}</span>
                  <span className={`text-sm ${highlighted ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {t(`pricing.tiers.${tier}.period`)}
                  </span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <span
                        className={`size-1.5 rounded-full mt-2 shrink-0 ${
                          highlighted ? "bg-accent" : "bg-primary"
                        }`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <a
                  href="/auth/sign-up"
                  className={`text-center px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                    highlighted
                      ? "bg-accent text-accent-foreground hover:brightness-105"
                      : "bg-foreground text-background hover:brightness-110"
                  }`}
                >
                  {t(`pricing.tiers.${tier}.cta`)}
                </a>
              </div>
            );
          })}
        </div>
      </section>
    </SiteLayout>
  );
}
