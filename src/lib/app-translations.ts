import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import i18nInstance from "./i18n";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import type { SupportedLanguage } from "./i18n";

type TranslationValue = string | string[] | Record<string, unknown>;
type TranslationOptions = Record<string, unknown> & { returnObjects?: boolean };
type AppTranslate = {
  (key: string): string;
  (key: string, options: TranslationOptions & { returnObjects: true }): unknown;
  (key: string, options?: TranslationOptions): string;
};

const dictionaries = { en, fr } as const;

function languageOf(value?: string): SupportedLanguage {
  return value?.toLowerCase().startsWith("fr") ? "fr" : "en";
}

function lookup(language: SupportedLanguage, key: string): TranslationValue | undefined {
  return key.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, dictionaries[language]) as TranslationValue | undefined;
}

function interpolate(value: TranslationValue, options?: TranslationOptions): TranslationValue {
  if (typeof value !== "string") return value;
  return value.replace(/{{\s*(\w+)\s*}}/g, (_, name: string) => String(options?.[name] ?? ""));
}

export function useAppTranslation() {
  const { t: translate, i18n } = useTranslation(undefined, { i18n: i18nInstance });

  // Subscribe explicitly to languageChanged so every consumer rerenders even
  // when react-i18next's internal subscription is missed during hydration.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (typeof i18nInstance?.on !== "function") return;
    const handler = () => setTick((n) => n + 1);
    i18nInstance.on("languageChanged", handler);
    return () => {
      if (typeof i18nInstance?.off === "function") {
        i18nInstance.off("languageChanged", handler);
      }
    };
  }, []);

  const activeI18n = i18n ?? i18nInstance;
  const language = languageOf(activeI18n?.resolvedLanguage ?? activeI18n?.language);

  const t = ((key: string, options?: TranslationOptions): TranslationValue => {
    const fallback = lookup(language, key) ?? lookup("en", key);
    const translated = translate(key, {
      ...options,
      lng: language,
      defaultValue: typeof fallback === "string" ? fallback : undefined,
    }) as TranslationValue;

    if (translated === key && fallback !== undefined) {
      return interpolate(fallback, options);
    }

    if (options?.returnObjects && typeof translated === "string" && fallback !== undefined) {
      return interpolate(fallback, options);
    }

    return translated;
  }) as AppTranslate;

  return { t, i18n: activeI18n, language };
}
