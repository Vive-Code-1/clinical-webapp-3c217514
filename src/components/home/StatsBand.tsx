import { useAppTranslation } from "@/lib/i18n/app-translations";

export function StatsBand() {
  const { t } = useAppTranslation();
  return (
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
  );
}
