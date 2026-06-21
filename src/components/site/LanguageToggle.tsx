import { useEffect, useState } from "react";
import { useAppTranslation } from "@/lib/app-translations";
import type { SupportedLanguage } from "@/lib/i18n";

const LANGS: SupportedLanguage[] = ["en", "fr"];

export function LanguageToggle() {
  const { i18n, t } = useAppTranslation();
  const [current, setCurrent] = useState<SupportedLanguage>(
    ((i18n.resolvedLanguage ?? i18n.language ?? "en").slice(0, 2)) as SupportedLanguage,
  );

  useEffect(() => {
    const onChanged = (lng: string) => {
      setCurrent((lng.slice(0, 2) as SupportedLanguage) || "en");
      if (typeof document !== "undefined") {
        document.documentElement.lang = lng.slice(0, 2);
      }
    };
    i18n.on("languageChanged", onChanged);
    return () => {
      i18n.off("languageChanged", onChanged);
    };
  }, [i18n]);

  const handleChange = (lng: SupportedLanguage) => {
    if (lng === current) return;
    setCurrent(lng);
    void i18n.changeLanguage(lng).then(() => {
      try {
        window.localStorage.setItem("sante-lang", lng);
      } catch {}
    });
  };

  return (
    <div className="flex bg-foreground/5 p-1 rounded-full text-[10px] font-bold tracking-wider">
      {LANGS.map((lng) => {
        const active = lng === current;
        return (
          <button
            key={lng}
            type="button"
            onClick={() => handleChange(lng)}
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
