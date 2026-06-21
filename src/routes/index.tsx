import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAppTranslation } from "@/lib/i18n/app-translations";
import { ArrowRight, Sparkles } from "lucide-react";
import dashboardPreview from "@/assets/dashboard-preview.jpg";
import { InteractiveWalkthrough } from "@/components/home/InteractiveWalkthrough";
import { FaqSection } from "@/components/home/FaqSection";
import { LeadCaptureForm } from "@/components/home/LeadCaptureForm";
import { BentoFeatures } from "@/components/home/BentoFeatures";
import { SimplifySection } from "@/components/home/SimplifySection";
import { StatsBand } from "@/components/home/StatsBand";
import { StepsSection, TestimonialSection } from "@/components/home/StepsAndTestimonial";
import { PricingTeaser, FinalCta } from "@/components/home/PricingAndCta";
import { trackHomeEvent } from "@/lib/utils/home-analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SANTÉ — All-in-one clinic management platform" },
      {
        name: "description",
        content:
          "Scheduling, charting, billing, telehealth, AI scribe and patient portal in one warm dashboard. Free 30-day trial · Bilingual EN / FR.",
      },
      { property: "og:title", content: "SANTÉ — All-in-one clinic management platform" },
      {
        property: "og:description",
        content:
          "Run your clinical practice with a calmer, faster all-in-one platform. Try free for 30 days.",
      },
      { property: "og:image", content: dashboardPreview },
      { name: "twitter:image", content: dashboardPreview },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t, language } = useAppTranslation();

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--primary) 22%, transparent) 0%, transparent 70%), linear-gradient(180deg, color-mix(in oklab, var(--primary) 10%, var(--background)) 0%, var(--background) 70%)",
          }}
        />
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-10 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/80 backdrop-blur border border-border text-xs font-semibold text-foreground/70 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {t("landing.badge")}
          </span>
          <h1 className="mt-6 text-5xl md:text-7xl font-extrabold tracking-tight text-balance text-foreground">
            {t("landing.hero.titlePre")}{" "}
            <span className="font-serif italic font-medium text-primary">
              {t("landing.hero.titleHighlight")}
            </span>
            {t("landing.hero.titlePost")}
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl font-serif text-muted-foreground leading-relaxed">
            {t("landing.hero.subtitle")}
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/auth/sign-up"
              onClick={() => void trackHomeEvent("cta_hero_primary", language)}
              className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-full text-base font-semibold shadow-xl shadow-primary/20 hover:-translate-y-0.5 transition-transform"
            >
              {t("landing.hero.ctaPrimary")}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#walkthrough"
              onClick={() => void trackHomeEvent("cta_hero_secondary", language)}
              className="inline-flex items-center gap-2 bg-card border border-border px-7 py-3.5 rounded-full text-base font-semibold text-foreground hover:bg-foreground/5 transition-colors"
            >
              {t("landing.hero.ctaSecondary")}
            </a>
          </div>
          <p className="mt-4 text-xs font-medium tracking-wide text-muted-foreground">
            {t("landing.hero.trustNote")}
          </p>
        </div>

        <div id="walkthrough" className="max-w-6xl mx-auto px-6 pb-10 scroll-mt-20">
          <div className="text-center mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
              {t("landing.walkthrough.eyebrow")}
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              {t("landing.walkthrough.title")}
            </h2>
            <p className="mt-2 text-sm md:text-base font-serif text-muted-foreground max-w-2xl mx-auto">
              {t("landing.walkthrough.subtitle")}
            </p>
          </div>
          <InteractiveWalkthrough />
          <p className="mt-8 text-center text-[11px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
            {t("landing.logos")}
          </p>
        </div>
      </section>

      <BentoFeatures />
      <SimplifySection />
      <StatsBand />
      <StepsSection />
      <TestimonialSection />
      <PricingTeaser />
      <FaqSection />
      <LeadCaptureForm />
      <FinalCta />
    </SiteLayout>
  );
}
