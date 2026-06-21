import { useState, type ReactNode } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Sparkles,
  Clock,
  MapPin,
  ClipboardList,
  Receipt,
  MessageSquare,
  Settings,
  LogOut,
  Leaf,
  BarChart3,
  Dumbbell,
} from "lucide-react";
import { useAppTranslation } from "@/lib/app-translations";
import { clinicBrandingQuery, myProfileQuery } from "@/lib/me-queries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { BottomNav } from "@/components/app/BottomNav";


type Props = {
  clinicId?: string;
  hideHeader?: boolean;
  children: ReactNode;
};

export function AppShell({ clinicId, hideHeader, children }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useAppTranslation();

  const branding = useQuery({
    ...clinicBrandingQuery(clinicId ?? ""),
    enabled: !!clinicId,
  });

  const userId = useUserId();
  const profile = useQuery({
    ...myProfileQuery(userId ?? ""),
    enabled: !!userId,
  });

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth/sign-in", replace: true });
  };

  const search = clinicId ? { clinic: clinicId } : undefined;

  const navItems = [
    { to: "/dashboard" as const, label: t("app.nav.dashboard"), icon: LayoutDashboard },
    { to: "/calendar" as const, label: t("app.nav.appointment"), icon: CalendarDays },
    { to: "/clients" as const, label: t("app.nav.clients"), icon: Users },
    { to: "/services" as const, label: t("app.nav.services"), icon: Sparkles },
    { to: "/availability" as const, label: t("app.nav.availability"), icon: Clock },
    { to: "/locations" as const, label: t("app.nav.locations"), icon: MapPin },
    { to: "/forms" as const, label: t("app.nav.forms"), icon: ClipboardList },
    { to: "/exercises" as const, label: t("app.nav.exercises"), icon: Dumbbell },
    { to: "/invoices" as const, label: t("app.nav.invoices"), icon: Receipt },
    { to: "/messages" as const, label: t("app.nav.messages"), icon: MessageSquare },
    { to: "/reports" as const, label: t("app.nav.reports"), icon: BarChart3 },
    { to: "/billing-settings" as const, label: t("app.nav.billing"), icon: Receipt },
    { to: "/integrations" as const, label: t("app.nav.integrations"), icon: Sparkles },
  ];

  const clinicName = branding.data?.name || "Helanthus";
  const logoSrc = branding.data?.logo_src ?? null;
  const initials = (profile.data?.full_name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "U";


  const SidebarInner = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <Link to="/" onClick={onNavigate} className="flex items-center gap-2 px-2 mb-10">
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={clinicName}
            className="w-9 h-9 rounded-xl object-cover bg-sidebar-deep-foreground/10"
          />
        ) : (
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-sidebar-deep-foreground/10">
            <Leaf className="w-5 h-5" />
          </span>
        )}
        <span className="text-xl font-bold tracking-tight truncate">{clinicName}</span>
      </Link>

      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              search={search}
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-deep-foreground/70 hover:text-sidebar-deep-foreground hover:bg-sidebar-deep-foreground/5 transition-colors"
              activeProps={{
                className:
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold bg-sidebar-deep-active text-sidebar-deep-foreground",
              }}
            >
              <Icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          );
        })}
        <div className="h-px bg-sidebar-deep-foreground/10 my-3" />
        <Link
          to="/settings"
          search={search}
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-deep-foreground/70 hover:text-sidebar-deep-foreground hover:bg-sidebar-deep-foreground/5 transition-colors"
          activeProps={{
            className:
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold bg-sidebar-deep-active text-sidebar-deep-foreground",
          }}
        >
          <Settings className="w-[18px] h-[18px]" />
          {t("app.nav.settings")}
        </Link>
      </nav>

      <button
        onClick={() => {
          onNavigate?.();
          handleSignOut();
        }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-deep-foreground/70 hover:text-sidebar-deep-foreground hover:bg-sidebar-deep-foreground/5 transition-colors"
      >
        <LogOut className="w-[18px] h-[18px]" />
        {t("app.nav.logout")}
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row p-2 sm:p-4 gap-2 sm:gap-4">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col rounded-3xl bg-sidebar-deep text-sidebar-deep-foreground px-5 py-6">
        <SidebarInner />
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile + tablet top bar */}
        <div className="lg:hidden flex items-center justify-between gap-2 px-2 py-2">
          <Link to="/" className="flex items-center gap-2 px-1">
            {logoSrc ? (
              <img src={logoSrc} alt={clinicName} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-sidebar-deep text-sidebar-deep-foreground">
                <Leaf className="w-4 h-4" />
              </span>
            )}
            <span className="text-base font-bold tracking-tight truncate max-w-[140px]">{clinicName}</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link
              to="/settings"
              search={search}
              className="flex items-center gap-1 px-1 py-1 rounded-full hover:bg-muted transition-colors"
            >
              <Avatar className="w-8 h-8">
                {profile.data?.avatar_src && (
                  <AvatarImage src={profile.data.avatar_src} alt={profile.data.full_name ?? ""} />
                )}
                <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>

        {/* Desktop header */}
        {!hideHeader && (
          <div className="hidden lg:flex w-full px-4 md:px-6 py-3 items-center justify-end gap-3">
            <LanguageToggle />
            <Link
              to="/settings"
              search={search}
              className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-muted transition-colors"
            >
              <span className="hidden sm:inline text-sm font-medium text-foreground">
                {profile.data?.full_name || ""}
              </span>
              <Avatar className="w-8 h-8">
                {profile.data?.avatar_src && (
                  <AvatarImage src={profile.data.avatar_src} alt={profile.data.full_name ?? ""} />
                )}
                <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        )}
        <div className="w-full min-w-0 flex-1 pb-24 lg:pb-0">
          {children}
        </div>
      </main>
      <BottomNav clinicId={clinicId} />
    </div>
  );
}

// Tiny hook to lazily read auth user id without prop-drilling.
import { useEffect } from "react";
function useUserId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted && data.user) setId(data.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (mounted) setId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return id;
}
