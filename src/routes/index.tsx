import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAppTranslation } from "@/lib/app-translations";
import {
  ArrowRight,
  CalendarCheck,
  MessageSquare,
  Activity,
  LineChart,
  Sparkles,
  ShieldCheck,
  Check,
  Star,
  ClipboardList,
} from "lucide-react";
import dashboardPreview from "@/assets/dashboard-preview.jpg";
import { InteractiveWalkthrough } from "@/components/home/InteractiveWalkthrough";
import { FaqSection } from "@/components/home/FaqSection";
import { LeadCaptureForm } from "@/components/home/LeadCaptureForm";
import { trackHomeEvent } from "@/lib/home-analytics";

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

type BentoTone = "stat-blue" | "stat-pink" | "stat-green" | "stat-peach" | "primary";

function BentoCard({
  icon: Icon,
  title,
  body,
  span,
  tone,
  dark,
}: {
  icon: typeof CalendarCheck;
  title: string;
  body: string;
  span?: string;
  tone: BentoTone;
  dark?: boolean;
}) {
  const bg: Record<BentoTone, string> = {
    "stat-blue": "bg-stat-blue",
    "stat-pink": "bg-stat-pink",
    "stat-green": "bg-stat-green",
    "stat-peach": "bg-stat-peach",
    primary: "bg-primary",
  };
  return (
    <div
      className={`group rounded-3xl p-7 border border-border/40 hover:-translate-y-1 hover:shadow-xl transition-all ${bg[tone]} ${
        dark ? "text-primary-foreground" : "text-foreground"
      } ${span ?? ""}`}
    >
      <span
        className={`grid place-items-center size-11 rounded-2xl mb-6 ${
          dark ? "bg-primary-foreground/15 text-primary-foreground" : "bg-card/80 text-primary"
        }`}
      >
        <Icon className="w-5 h-5" />
      </span>
      <h3 className="text-lg md:text-xl font-bold mb-2">{title}</h3>
      <p
        className={`text-sm font-serif leading-relaxed ${
          dark ? "text-primary-foreground/80" : "text-foreground/70"
        }`}
      >
        {body}
      </p>
    </div>
  );
}

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

      {/* BENTO FEATURES */}
      <section className="px-6 py-20 bg-accent/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-end mb-12">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
              {t("landing.bento.eyebrow")}{" "}
              <span className="font-serif italic font-medium text-primary">
                {t("landing.bento.eyebrowAlt")}
              </span>
            </h2>
            <p className="text-base md:text-lg font-serif text-muted-foreground">
              {t("landing.bento.intro")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <BentoCard span="md:col-span-2" tone="stat-blue" icon={LineChart}
              title={t("landing.bento.items.dashboard.title")} body={t("landing.bento.items.dashboard.body")} />
            <BentoCard tone="stat-pink" icon={MessageSquare}
              title={t("landing.bento.items.team.title")} body={t("landing.bento.items.team.body")} />
            <BentoCard tone="stat-green" icon={CalendarCheck}
              title={t("landing.bento.items.appts.title")} body={t("landing.bento.items.appts.body")} />
            <BentoCard tone="stat-peach" icon={Activity}
              title={t("landing.bento.items.activity.title")} body={t("landing.bento.items.activity.body")} />
            <BentoCard tone="stat-blue" icon={Sparkles}
              title={t("landing.bento.items.progress.title")} body={t("landing.bento.items.progress.body")} />
            <BentoCard span="md:col-span-3" tone="primary" dark icon={ClipboardList}
              title={t("landing.bento.items.scribe.title")} body={t("landing.bento.items.scribe.body")} />
          </div>
        </div>
      </section>

      {/* SIMPLIFY */}
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

      {/* STATS BAND */}
      <section className="px-6 py-16 bg-sidebar-deep text-sidebar-deep-foreground">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-center text-sm font-bold uppercase tracking-widest text-sidebar-deep-foreground/60 mb-10">
            {t("landing.stats.title")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {(["time", "noshow", "faster", "rating"] as const).map((key) => (
              <div key={key} className="text-center">
                <div className="text-4xl md:text-5xl font-extrabold tracking-tight">
                  {t(`landing.stats.items.${key}.value`)}
                </div>
                <div className="mt-2 text-sm text-sidebar-deep-foreground/70 font-serif">
                  {t(`landing.stats.items.${key}.label`)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STEPS */}
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

      {/* TESTIMONIAL */}
      <section className="px-6 py-20 bg-accent/40">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-1 mb-6 text-primary">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-current" />
            ))}
          </div>
          <blockquote className="text-2xl md:text-3xl font-serif italic text-foreground leading-snug">
            “{t("landing.testimonial.quote")}”
          </blockquote>
          <div className="mt-8">
            <div className="font-bold text-foreground">{t("landing.testimonial.author")}</div>
            <div className="text-sm text-muted-foreground">{t("landing.testimonial.role")}</div>
          </div>
        </div>
      </section>

      {/* PRICING TEASER */}
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

      {/* FAQ */}
      <FaqSection />

      {/* LEAD CAPTURE */}
      <LeadCaptureForm />

      {/* FINAL CTA */}
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
    </SiteLayout>
  );
}
