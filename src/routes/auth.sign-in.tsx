import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState, type FormEvent } from "react";
import { LanguageToggle } from "@/components/site/LanguageToggle";

export const Route = createFileRoute("/auth/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign in — SANTÉ" },
      { name: "description", content: "Sign in to your SANTÉ clinic workspace." },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(t("auth.errors.backendMissing"));
  };

  return <AuthShell mode="sign-in" onSubmit={onSubmit} error={error} setError={setError} />;
}

type AuthShellProps = {
  mode: "sign-in" | "sign-up";
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  error: string | null;
  setError: (msg: string | null) => void;
};

export function AuthShell({ mode, onSubmit, error, setError }: AuthShellProps) {
  const { t } = useTranslation();
  const key = mode === "sign-in" ? "signIn" : "signUp";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="px-6 py-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link to="/" className="text-lg font-extrabold tracking-tight uppercase">
          {t("brand")}
        </Link>
        <LanguageToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-reveal">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold tracking-tight mb-3">{t(`auth.${key}.title`)}</h1>
            <p className="font-serif text-muted-foreground">{t(`auth.${key}.subtitle`)}</p>
          </div>

          <div className="bg-card rounded-3xl p-8 ring-1 ring-border shadow-xl">
            <button
              type="button"
              onClick={() => setError(t("auth.errors.backendMissing"))}
              className="w-full bg-foreground text-background px-4 py-3 rounded-xl text-sm font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-3"
            >
              <GoogleMark />
              {t(`auth.${key}.google`)}
            </button>

            <div className="flex items-center gap-3 my-6">
              <span className="flex-1 h-px bg-border" />
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {t("auth.signUp.or")}
              </span>
              <span className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "sign-up" && (
                <AuthField label={t("auth.signUp.name")} name="name" required />
              )}
              <AuthField label={t(`auth.${key}.email`)} name="email" type="email" required />
              <AuthField label={t(`auth.${key}.password`)} name="password" type="password" required />

              {error && (
                <div className="text-sm font-medium text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 hover:brightness-110 transition-all"
              >
                {t(`auth.${key}.submit`)}
              </button>

              {mode === "sign-in" && (
                <div className="text-center">
                  <a href="#" className="text-xs font-medium text-muted-foreground hover:text-foreground">
                    {t("auth.signIn.forgot")}
                  </a>
                </div>
              )}
            </form>
          </div>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            {mode === "sign-in" ? (
              <>
                {t("auth.signIn.noAccount")}{" "}
                <Link to="/auth/sign-up" className="font-semibold text-foreground hover:text-primary">
                  {t("auth.signIn.createAccount")}
                </Link>
              </>
            ) : (
              <>
                {t("auth.signUp.haveAccount")}{" "}
                <Link to="/auth/sign-in" className="font-semibold text-foreground hover:text-primary">
                  {t("auth.signUp.signIn")}
                </Link>
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}

function AuthField({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
      />
    </label>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5 44.5 36.3 44.5 25c0-1.5-.2-3-.5-4.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5c-7.5 0-14 4.1-17.7 10.2z"
      />
      <path
        fill="#4CAF50"
        d="M24 45.5c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.4 36.2 26.8 37 24 37c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.7 41.2 16.3 45.5 24 45.5z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.5 5.5c-.5.4 7.2-5.3 7.2-15.5 0-1.5-.2-3-.4-3z"
      />
    </svg>
  );
}
