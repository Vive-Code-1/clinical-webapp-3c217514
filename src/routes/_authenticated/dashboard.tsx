import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle } from "@/components/site/LanguageToggle";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — SANTÉ" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useTranslation();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const queryClient = useQueryClient();

  const profile = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, preferred_language")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const roles = useQuery({
    queryKey: ["roles", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return data?.map((r) => r.role) ?? [];
    },
  });

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth/sign-in", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="text-lg font-extrabold tracking-tight uppercase">
            {t("brand")}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <button
              onClick={handleSignOut}
              className="text-sm font-semibold px-4 py-2 rounded-xl border border-input hover:bg-accent transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="animate-reveal">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Phase 1 · Foundation
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
            Welcome{profile.data?.full_name ? `, ${profile.data.full_name}` : ""}.
          </h1>
          <p className="font-serif text-lg text-muted-foreground mb-10">
            Your sanctuary is ready. Scheduling, clinical records, billing, and the client portal arrive in the next phases.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card rounded-3xl p-8 ring-1 ring-border">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Account</p>
              <p className="text-sm font-mono break-all">{user.email}</p>
            </div>
            <div className="bg-card rounded-3xl p-8 ring-1 ring-border">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Roles</p>
              <div className="flex flex-wrap gap-2">
                {(roles.data ?? []).map((r) => (
                  <span
                    key={r}
                    className="text-xs font-bold uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full"
                  >
                    {r}
                  </span>
                ))}
                {roles.data?.length === 0 && (
                  <span className="text-sm text-muted-foreground">No roles assigned.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
