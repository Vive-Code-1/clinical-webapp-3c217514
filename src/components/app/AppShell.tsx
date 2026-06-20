import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle } from "@/components/site/LanguageToggle";

type Props = {
  clinicId?: string;
  children: ReactNode;
};

export function AppShell({ clinicId, children }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth/sign-in", replace: true });
  };

  const search = clinicId ? { clinic: clinicId } : undefined;

  const navItems = [
    { to: "/dashboard" as const, label: "Overview" },
    { to: "/calendar" as const, label: "Calendar" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-card/40 px-5 py-6">
        <Link to="/" className="text-lg font-extrabold tracking-tight uppercase mb-10">
          {t("brand")}
        </Link>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              search={search}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              activeProps={{ className: "px-3 py-2 rounded-lg text-sm font-semibold bg-accent text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-2 mt-4">
          <LanguageToggle />
          <button
            onClick={handleSignOut}
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
