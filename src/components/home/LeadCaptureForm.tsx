import { useState } from "react";
import { z } from "zod";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppTranslation } from "@/lib/app-translations";
import { trackHomeEvent } from "@/lib/home-analytics";

const SERVICES = ["scheduling", "billing", "clinical", "telehealth", "all"] as const;

const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z
    .string()
    .trim()
    .min(6, { message: "Phone too short" })
    .max(30)
    .regex(/^[0-9+()\-\s]+$/, { message: "Invalid phone" }),
  service: z.enum(SERVICES),
});

export function LeadCaptureForm() {
  const { t, language } = useAppTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    void trackHomeEvent("lead_submit", language);

    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      full_name: fd.get("full_name"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      service: fd.get("service"),
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setError(first?.message ?? t("landing.lead.error"));
      void trackHomeEvent("lead_submit_error", language, { reason: "validation" });
      return;
    }

    setSubmitting(true);
    const { error: dbError } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("home_leads" as any)
      .insert({
        ...parsed.data,
        locale: language,
        source: "home_landing",
      });
    setSubmitting(false);

    if (dbError) {
      setError(t("landing.lead.error"));
      void trackHomeEvent("lead_submit_error", language, { reason: "db", code: dbError.code });
      return;
    }

    setDone(true);
    void trackHomeEvent("lead_submit_success", language, { service: parsed.data.service });
  }

  return (
    <section className="px-6 py-24" id="lead">
      <div className="max-w-5xl mx-auto grid md:grid-cols-[1.05fr_1fr] gap-10 items-center bg-card border border-border rounded-[2.5rem] p-8 md:p-12 shadow-xl">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">
            {t("landing.lead.eyebrow")}
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">
            {t("landing.lead.title")}
          </h2>
          <p className="text-base font-serif text-muted-foreground leading-relaxed">
            {t("landing.lead.body")}
          </p>
          <ul className="mt-6 space-y-2 text-sm text-foreground">
            {(t("landing.lead.bullets", { returnObjects: true }) as unknown as string[]).map(
              (b) => (
                <li key={b} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {b}
                </li>
              ),
            )}
          </ul>
        </div>

        {done ? (
          <div className="rounded-3xl bg-primary/5 border border-primary/20 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="text-xl font-bold text-foreground mb-2">
              {t("landing.lead.successTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">{t("landing.lead.successBody")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field label={t("landing.lead.fields.name")}>
              <input
                name="full_name"
                required
                maxLength={120}
                autoComplete="name"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Dr. Léa Bernard"
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t("landing.lead.fields.email")}>
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={255}
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="lea@clinic.com"
                />
              </Field>
              <Field label={t("landing.lead.fields.phone")}>
                <input
                  name="phone"
                  type="tel"
                  required
                  maxLength={30}
                  autoComplete="tel"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="+1 514 555 0199"
                />
              </Field>
            </div>
            <Field label={t("landing.lead.fields.service")}>
              <select
                name="service"
                required
                defaultValue="all"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {SERVICES.map((s) => (
                  <option key={s} value={s}>
                    {t(`landing.lead.services.${s}`)}
                  </option>
                ))}
              </select>
            </Field>

            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3.5 rounded-full text-base font-semibold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {t("landing.lead.submit")}
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              {t("landing.lead.privacy")}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}
