import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/site/SiteLayout";
import sanctuaryOffice from "@/assets/sanctuary-office.jpg";
import dashboardPreview from "@/assets/dashboard-preview.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SANTÉ — The sanctuary for your clinical flow" },
      {
        name: "description",
        content:
          "Modern clinic management for solo practitioners, multi-practitioner clinics, and a beautifully secure client portal. Bilingual EN / FR.",
      },
      { property: "og:title", content: "SANTÉ — The sanctuary for your clinical flow" },
      {
        property: "og:description",
        content: "Modern clinic management for solo practitioners and multi-practitioner clinics.",
      },
      { property: "og:image", content: sanctuaryOffice },
      { name: "twitter:image", content: sanctuaryOffice },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation();

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center animate-reveal">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-balance mb-8 text-foreground">
            {t("home.hero.titlePre")}{" "}
            <span className="font-serif italic font-medium text-primary">
              {t("home.hero.titleHighlight")}
            </span>
            {t("home.hero.titlePost")}
          </h1>
          <p className="text-xl md:text-2xl font-serif text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed mb-10">
            {t("home.hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/auth/sign-up"
              className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-4 rounded-xl text-lg font-bold shadow-xl shadow-primary/10 hover:-translate-y-0.5 transition-transform"
            >
              {t("home.hero.ctaPrimary")}
            </a>
            <a
              href="/contact"
              className="w-full sm:w-auto bg-card border border-border px-8 py-4 rounded-xl text-lg font-bold hover:bg-foreground/5 transition-colors"
            >
              {t("home.hero.ctaSecondary")}
            </a>
          </div>
        </div>

        {/* Product preview */}
        <div className="max-w-6xl mx-auto mt-20 animate-reveal [animation-delay:200ms]">
          <div className="relative bg-card rounded-[2rem] p-4 shadow-2xl ring-1 ring-foreground/5 overflow-hidden">
            <div className="w-full aspect-[16/10] bg-secondary rounded-[1.5rem] overflow-hidden flex flex-col">
              <div className="h-12 border-b border-foreground/5 flex items-center px-6 gap-2 shrink-0">
                <div className="size-2 rounded-full bg-foreground/10" />
                <div className="size-2 rounded-full bg-foreground/10" />
                <div className="size-2 rounded-full bg-foreground/10" />
              </div>
              <img
                src={dashboardPreview}
                alt={t("home.hero.previewLabel")}
                width={1600}
                height={1000}
                loading="eager"
                className="flex-1 w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-accent/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {(["scheduling", "notes", "billing"] as const).map((key, i) => (
              <div key={key} className="animate-reveal" style={{ animationDelay: `${(i + 3) * 100}ms` }}>
                <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                  <div className="size-6 border-2 border-primary rounded-md" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">
                  {t(`home.features.${key}.title`)}
                </h3>
                <p className="text-muted-foreground leading-relaxed font-serif">
                  {t(`home.features.${key}.body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scale */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-4 block">
              {t("home.scale.eyebrow")}
            </span>
            <h2 className="text-4xl font-extrabold mb-6 tracking-tight text-foreground">
              {t("home.scale.title")}
            </h2>
            <p className="text-lg font-serif text-muted-foreground mb-8">{t("home.scale.body")}</p>
            <ul className="space-y-4">
              {(["permissions", "reporting", "portal"] as const).map((key) => (
                <li key={key} className="flex items-center gap-3 font-medium text-foreground">
                  <span className="size-1.5 rounded-full bg-primary" /> {t(`home.scale.items.${key}`)}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 w-full animate-reveal">
            <div className="w-full aspect-square bg-card rounded-3xl ring-1 ring-foreground/5 shadow-xl overflow-hidden">
              <img
                src={sanctuaryOffice}
                alt={t("home.scale.imageLabel")}
                width={1024}
                height={1024}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
