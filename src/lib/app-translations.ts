import { useTranslation } from "react-i18next";

import "./i18n";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import type { SupportedLanguage } from "./i18n";

type TranslationValue = string | string[] | Record<string, unknown>;
type TranslationOptions = Record<string, unknown> & { returnObjects?: boolean };

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
  const { t: translate, i18n } = useTranslation();
  const language = languageOf(i18n.resolvedLanguage ?? i18n.language);

  const t = (key: string, options?: TranslationOptions): TranslationValue => {
    const fallback = lookup(language, key) ?? lookup("en", key);
    const translated = translate(key, {
      ...options,
      defaultValue: typeof fallback === "string" ? fallback : undefined,
    });

    if (translated === key && fallback !== undefined) {
      return interpolate(fallback, options);
    }

    if (options?.returnObjects && typeof translated === "string" && fallback !== undefined) {
      return interpolate(fallback, options);
    }

    return translated;
  };

  return { t, i18n, language };
}