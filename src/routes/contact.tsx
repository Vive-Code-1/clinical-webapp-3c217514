import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAppTranslation } from "@/lib/i18n/app-translations";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — SANTÉ" },
      { name: "description", content: "Talk to our team about SANTÉ for your practice or clinic." },
      { property: "og:title", content: "Contact — SANTÉ" },
      { property: "og:description", content: "Get in touch about your practice." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { t } = useAppTranslation();
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <SiteLayout>
      <section className="pt-24 pb-12 px-6">
        <div className="max-w-2xl mx-auto text-center animate-reveal">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-balance text-foreground mb-6">
            {t("contact.title")}
          </h1>
          <p className="text-xl font-serif text-muted-foreground text-pretty">{t("contact.subtitle")}</p>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-xl mx-auto bg-card rounded-3xl p-8 ring-1 ring-border shadow-xl animate-reveal">
          {sent ? (
            <p className="text-center font-serif text-lg text-foreground py-10">
              {t("contact.form.success")}
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <FormField label={t("contact.form.name")} name="name" required />
              <FormField label={t("contact.form.email")} name="email" type="email" required />
              <FormField label={t("contact.form.clinic")} name="clinic" />
              <FormField
                label={t("contact.form.message")}
                name="message"
                required
                as="textarea"
                rows={4}
              />
              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground px-6 py-4 rounded-xl text-base font-bold shadow-lg shadow-primary/10 hover:brightness-110 transition-all"
              >
                {t("contact.form.submit")}
              </button>
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  as?: "input" | "textarea";
  rows?: number;
};

function FormField({ label, name, type = "text", required, as = "input", rows }: FormFieldProps) {
  const baseClass =
    "w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all";
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">{label}</span>
      {as === "textarea" ? (
        <textarea name={name} rows={rows} required={required} className={baseClass} />
      ) : (
        <input name={name} type={type} required={required} className={baseClass} />
      )}
    </label>
  );
}
