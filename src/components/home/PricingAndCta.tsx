import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { useAppTranslation } from "@/lib/i18n/app-translations";
import { trackHomeEvent } from "@/lib/utils/home-analytics";

export function PricingTeaser() {
  const { t, language } = useAppTranslation();
  return (
    <section className="px-6 py-24">
      <div className="max-w-5xl mx-auto rounded-[2.5rem] bg-card border border-border p-10 md:p-14 text-center shadow-xl">
        <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">
          {t("landing.pricing.eyebrow")}
        </span>
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
          {t("landing.pricing.title")}
        </h2>
        <p className="text-lg font-serif text-muted-foreground max-w-2xl mx-auto mb-8">
          {t("landing.pricing.body")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-8 text-sm font-medium text-foreground">
          {["Scheduling", "Charting", "Billing", "Telehealth", "Portal"].map((f) => (
            <span key={f} className="inline-flex items-center gap-1.5">
              <Check className="w-4 h-4 text-primary" />
              {f}
            </span>
          ))}
        </div>
        <Link
          to="/pricing"
          onClick={() => void trackHomeEvent("cta_pricing", language)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-full text-base font-semibold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform"
        >
          {t("landing.pricing.cta")}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

export function FinalCta() {
  const { t, language } = useAppTranslation();
  return (
    <section className="px-6 pb-24">
      <div
        className="max-w-7xl mx-auto rounded-[2.5rem] p-10 md:p-16 text-center"
        style={{
          background:
            "linear-gradient(135deg, var(--sidebar-deep) 0%, color-mix(in oklab, var(--primary) 80%, black) 100%)",
          color: "var(--sidebar-deep-foreground)",
        }}
      >
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-5">
          {t("landing.cta.title")}
        </h2>
        <p className="text-lg md:text-xl font-serif opacity-80 max-w-2xl mx-auto mb-10">
          {t("landing.cta.body")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/auth/sign-up"
            onClick={() => void trackHomeEvent("cta_final_primary", language)}
            className="inline-flex items-center gap-2 bg-background text-foreground px-7 py-3.5 rounded-full text-base font-semibold hover:-translate-y-0.5 transition-transform"
          >
            {t("landing.cta.primary")}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/contact"
            onClick={() => void trackHomeEvent("cta_final_secondary", language)}
            className="inline-flex items-center gap-2 border border-sidebar-deep-foreground/30 px-7 py-3.5 rounded-full text-base font-semibold hover:bg-sidebar-deep-foreground/10 transition-colors"
          >
            {t("landing.cta.secondary")}
          </Link>
        </div>
      </div>
    </section>
  );
}
