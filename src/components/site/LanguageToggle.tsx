import { useTranslation } from "react-i18next";
import type { SupportedLanguage } from "@/lib/i18n";

const LANGS: SupportedLanguage[] = ["en", "fr"];

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? "en").slice(0, 2) as SupportedLanguage;

  return (
    <div className="flex bg-foreground/5 p-1 rounded-full text-[10px] font-bold tracking-wider">
      {LANGS.map((lng) => {
        const active = lng === current;
        return (
          <button
            key={lng}
            type="button"
            onClick={() => void i18n.changeLanguage(lng)}
            aria-pressed={active}
            className={`px-3 py-1 rounded-full transition-all ${
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(`lang.${lng}`)}
          </button>
        );
      })}
    </div>
  );
}
