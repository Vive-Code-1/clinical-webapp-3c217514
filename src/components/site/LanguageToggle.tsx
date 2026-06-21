import { useEffect, useState } from "react";
import i18nInstance, { type SupportedLanguage } from "@/lib/i18n";
import { useAppTranslation } from "@/lib/app-translations";

const LANGS: SupportedLanguage[] = ["en", "fr"];

function readCurrent(): SupportedLanguage {
  const raw = (i18nInstance.resolvedLanguage ?? i18nInstance.language ?? "en")
    .toLowerCase()
    .slice(0, 2);
  return raw === "fr" ? "fr" : "en";
}

export function LanguageToggle() {
  const { t } = useAppTranslation();
  const [current, setCurrent] = useState<SupportedLanguage>(readCurrent);

  useEffect(() => {
    setCurrent(readCurrent());
    const onChanged = (lng: string) => {
      const next = lng.toLowerCase().slice(0, 2) === "fr" ? "fr" : "en";
      setCurrent(next);
      if (typeof document !== "undefined") {
        document.documentElement.lang = next;
      }
    };
    if (typeof i18nInstance?.on !== "function") return;
    i18nInstance.on("languageChanged", onChanged);
    return () => {
      if (typeof i18nInstance?.off === "function") {
        i18nInstance.off("languageChanged", onChanged);
      }
    };
  }, []);

  const handleChange = async (lng: SupportedLanguage) => {
    if (lng === current) return;
    try {
      window.localStorage.setItem("sante-lang", lng);
    } catch {}
    try {
      await i18nInstance.changeLanguage(lng);
    } catch (err) {
      console.error("changeLanguage failed", err);
    }
    setCurrent(lng);
    if (typeof document !== "undefined") {
      document.documentElement.lang = lng;
    }
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
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(`lang.${lng}`)}
          </button>
        );
      })}
    </div>
  );
}
