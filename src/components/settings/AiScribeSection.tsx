import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ScribeDialog } from "@/components/scribe/ScribeDialog";
import { useAppTranslation } from "@/lib/i18n/app-translations";

export function AiScribeSection() {
  const { t } = useAppTranslation();
  const [scribeOpen, setScribeOpen] = useState(false);

  return (
    <>
      <section className="rounded-2xl border border-border bg-card card-pop p-5 space-y-3">
        <header className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{t("app.settings.aiScribe")}</h2>
        </header>
        <p className="text-sm text-muted-foreground">{t("app.settings.aiScribeBody")}</p>
        <button
          type="button"
          onClick={() => setScribeOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" /> {t("app.settings.openScribe")}
        </button>
      </section>
      <ScribeDialog open={scribeOpen} onClose={() => setScribeOpen(false)} />
    </>
  );
}
