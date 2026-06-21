import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAppTranslation } from "@/lib/i18n/app-translations";

const GROUPS = ["scheduling", "billing", "clinical", "client", "admin"] as const;

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — SANTÉ" },
      {
        name: "description",
        content:
          "Scheduling, clinical notes, billing, telehealth, and a beautiful client portal — built for modern practices.",
      },
      { property: "og:title", content: "Features — SANTÉ" },
      {
        property: "og:description",
        content: "Every tool a modern practice needs, in one calm workspace.",
      },
    ],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  const { t } = useAppTranslation();

  return (
    <SiteLayout>
      <section className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center animate-reveal">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-balance text-foreground mb-6">
            {t("features.title")}
          </h1>
          <p className="text-xl font-serif text-muted-foreground max-w-2xl mx-auto text-pretty">
            {t("features.subtitle")}
          </p>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto space-y-16">
          {GROUPS.map((key, idx) => {
            const items = t(`features.groups.${key}.items`, { returnObjects: true }) as string[];
            return (
              <div
                key={key}
                className="grid md:grid-cols-[1fr_2fr] gap-8 md:gap-16 items-start animate-reveal"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-primary">
                    0{idx + 1}
                  </span>
                  <h2 className="text-3xl font-extrabold tracking-tight mt-2 text-foreground">
                    {t(`features.groups.${key}.title`)}
                  </h2>
                </div>
                <ul className="space-y-4 border-l border-border pl-8">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-3 font-serif text-lg text-foreground/90">
                      <span className="size-1.5 rounded-full bg-primary mt-3 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </SiteLayout>
  );
}
