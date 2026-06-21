import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

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
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const full_name = String(form.get("name") ?? "");
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name },
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      router.navigate({ to: "/dashboard", replace: true });
    } else {
      setError("Check your inbox to confirm your email, then sign in.");
    }
  };

  const onGoogle = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      setError(result.error.message ?? "Google sign-up failed.");
      return;
    }
    if (result.redirected) return;
    router.navigate({ to: "/dashboard", replace: true });
  };

  return (
    <AuthShell
      mode="sign-up"
      onSubmit={onSubmit}
      onGoogle={onGoogle}
      error={error}
      loading={loading}
    />
  );
}
