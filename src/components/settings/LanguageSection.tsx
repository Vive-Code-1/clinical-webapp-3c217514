import { Languages } from "lucide-react";
import { useAppTranslation } from "@/lib/i18n/app-translations";
import type { SupportedLanguage } from "@/lib/i18n";

export function LanguageSection() {
  const { t, i18n } = useAppTranslation();
  const currentLang = ((i18n.resolvedLanguage ?? "en").slice(0, 2)) as SupportedLanguage;

  return (
    <section className="rounded-2xl border border-border bg-card card-pop p-5 space-y-3">
      <header className="flex items-center gap-2">
        <Languages className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{t("app.settings.language")}</h2>
      </header>
      <p className="text-sm text-muted-foreground">{t("app.settings.languageHelp")}</p>
      <div className="inline-flex rounded-xl border border-border bg-background p-1">
        {(["en", "fr"] as const).map((lng) => (
          <button
            key={lng}
            type="button"
            onClick={() => void i18n.changeLanguage(lng)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              currentLang === lng
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {lng === "en" ? "English" : "Français"}
          </button>
        ))}
      </div>
    </section>
  );
}
