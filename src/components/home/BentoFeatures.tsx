import {
  Activity,
  CalendarCheck,
  ClipboardList,
  LineChart,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useAppTranslation } from "@/lib/i18n/app-translations";
import { BentoCard } from "./BentoCard";

export function BentoFeatures() {
  const { t } = useAppTranslation();
  return (
    <section className="px-6 py-20 bg-accent/30">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 items-end mb-12">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            {t("landing.bento.eyebrow")}{" "}
            <span className="font-serif italic font-medium text-primary">
              {t("landing.bento.eyebrowAlt")}
            </span>
          </h2>
          <p className="text-base md:text-lg font-serif text-muted-foreground">
            {t("landing.bento.intro")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <BentoCard span="md:col-span-2" tone="stat-blue" icon={LineChart}
            title={t("landing.bento.items.dashboard.title")} body={t("landing.bento.items.dashboard.body")} />
          <BentoCard tone="stat-pink" icon={MessageSquare}
            title={t("landing.bento.items.team.title")} body={t("landing.bento.items.team.body")} />
          <BentoCard tone="stat-green" icon={CalendarCheck}
            title={t("landing.bento.items.appts.title")} body={t("landing.bento.items.appts.body")} />
          <BentoCard tone="stat-peach" icon={Activity}
            title={t("landing.bento.items.activity.title")} body={t("landing.bento.items.activity.body")} />
          <BentoCard tone="stat-blue" icon={Sparkles}
            title={t("landing.bento.items.progress.title")} body={t("landing.bento.items.progress.body")} />
          <BentoCard span="md:col-span-3" tone="primary" dark icon={ClipboardList}
            title={t("landing.bento.items.scribe.title")} body={t("landing.bento.items.scribe.body")} />
        </div>
      </div>
    </section>
  );
}
