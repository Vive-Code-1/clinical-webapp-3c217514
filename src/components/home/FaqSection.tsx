import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAppTranslation } from "@/lib/i18n/app-translations";
import { trackHomeEvent } from "@/lib/utils/home-analytics";

const KEYS = [
  "appointments_1",
  "appointments_2",
  "billing_1",
  "billing_2",
  "clinical_1",
  "clinical_2",
  "security_1",
  "security_2",
] as const;

export function FaqSection() {
  const { t, language } = useAppTranslation();

  return (
    <section className="px-6 py-24" id="faq">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">
            {t("landing.faq.eyebrow")}
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            {t("landing.faq.title")}
          </h2>
          <p className="mt-4 text-lg font-serif text-muted-foreground">
            {t("landing.faq.subtitle")}
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          className="rounded-3xl bg-card border border-border divide-y divide-border overflow-hidden"
          onValueChange={(val) => {
            if (val) void trackHomeEvent("faq_open", language, { question: val });
          }}
        >
          {KEYS.map((k) => (
            <AccordionItem key={k} value={k} className="border-0">
              <AccordionTrigger className="px-6 py-5 text-base font-semibold text-foreground hover:no-underline hover:bg-foreground/[0.02]">
                {t(`landing.faq.items.${k}.q`)}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-5 text-sm font-serif text-muted-foreground leading-relaxed">
                {t(`landing.faq.items.${k}.a`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
