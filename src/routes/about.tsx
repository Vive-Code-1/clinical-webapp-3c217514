import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAppTranslation } from "@/lib/app-translations";
import sanctuaryOffice from "@/assets/sanctuary-office.jpg";

const VALUES = ["trust", "warmth", "scale"] as const;

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — SANTÉ" },
      {
        name: "description",
        content: "We're building the calmest, warmest clinic platform — bilingual and Canadian.",
      },
      { property: "og:title", content: "About — SANTÉ" },
      {
        property: "og:description",
        content: "Calm, warm clinic software, built bilingual in Canada.",
      },
      { property: "og:image", content: sanctuaryOffice },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useAppTranslation();
  return (
    <SiteLayout>
      <section className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center animate-reveal">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-balance text-foreground mb-6">
            {t("about.title")}
          </h1>
          <p className="text-xl font-serif text-muted-foreground max-w-2xl mx-auto text-pretty">
            {t("about.body")}
          </p>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="max-w-5xl mx-auto rounded-3xl overflow-hidden ring-1 ring-foreground/5 shadow-2xl animate-reveal">
          <img
            src={sanctuaryOffice}
            alt="Sanctuary"
            width={1280}
            height={1280}
            loading="lazy"
            className="w-full aspect-[16/9] object-cover"
          />
        </div>
      </section>

      <section className="py-24 px-6 bg-accent/30">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-12">
          {VALUES.map((value, idx) => (
            <div key={value} className="animate-reveal" style={{ animationDelay: `${idx * 80}ms` }}>
              <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <div className="size-6 border-2 border-primary rounded-md" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">
                {t(`about.values.${value}.title`)}
              </h3>
              <p className="text-muted-foreground leading-relaxed font-serif">
                {t(`about.values.${value}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
