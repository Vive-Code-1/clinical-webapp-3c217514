import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState, type FormEvent } from "react";
import { AuthShell } from "./auth.sign-in";

export const Route = createFileRoute("/auth/sign-up")({
  head: () => ({
    meta: [
      { title: "Create your workspace — SANTÉ" },
      { name: "description", content: "Start your 30-day free trial on SANTÉ." },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(t("auth.errors.backendMissing"));
  };

  return <AuthShell mode="sign-up" onSubmit={onSubmit} error={error} setError={setError} />;
}
