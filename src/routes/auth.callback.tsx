import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({ meta: [{ title: "Signing you in…" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const finish = async () => {
      // supabase-js auto-detects session from the URL hash on load.
      // Wait briefly then check; also handle code= query (PKCE) explicitly.
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (!cancelled) setError(error.message);
          return;
        }
      }
      // Give the auto-detect a tick to settle the session
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.navigate({ to: "/dashboard", replace: true });
          return;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      router.navigate({ to: "/auth/sign-in", replace: true });
    };
    finish();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">SANTÉ</p>
        <p className="font-serif text-lg">{error ?? "Signing you in…"}</p>
      </div>
    </div>
  );
}
