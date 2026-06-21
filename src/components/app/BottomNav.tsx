import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  MessageSquare,
  MoreHorizontal,
  Sparkles,
  Clock,
  MapPin,
  ClipboardList,
  Dumbbell,
  Receipt,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useAppTranslation } from "@/lib/i18n/app-translations";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type NavItem = {
  to:
    | "/dashboard"
    | "/clients"
    | "/calendar"
    | "/messages"
    | "/services"
    | "/availability"
    | "/locations"
    | "/forms"
    | "/exercises"
    | "/invoices"
    | "/reports"
    | "/billing-settings"
    | "/integrations"
    | "/settings";
  label: string;
  icon: LucideIcon;
};

type Props = {
  clinicId?: string;
};

export function BottomNav({ clinicId }: Props) {
  const { t } = useAppTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = clinicId ? { clinic: clinicId } : undefined;

  const primary: NavItem[] = [
    { to: "/dashboard", label: t("app.nav.dashboard"), icon: LayoutDashboard },
    { to: "/clients", label: t("app.nav.clients"), icon: Users },
    { to: "/calendar", label: t("app.nav.appointment"), icon: CalendarDays },
    { to: "/messages", label: t("app.nav.messages"), icon: MessageSquare },
  ];

  const more: NavItem[] = [
    { to: "/services", label: t("app.nav.services"), icon: Sparkles },
    { to: "/availability", label: t("app.nav.availability"), icon: Clock },
    { to: "/locations", label: t("app.nav.locations"), icon: MapPin },
    { to: "/forms", label: t("app.nav.forms"), icon: ClipboardList },
    { to: "/exercises", label: t("app.nav.exercises"), icon: Dumbbell },
    { to: "/invoices", label: t("app.nav.invoices"), icon: Receipt },
    { to: "/reports", label: t("app.nav.reports"), icon: BarChart3 },
    { to: "/billing-settings", label: t("app.nav.billing"), icon: Receipt },
    { to: "/integrations", label: t("app.nav.integrations"), icon: Sparkles },
    { to: "/settings", label: t("app.nav.settings"), icon: Settings },
  ];

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");
  const moreActive = more.some((m) => isActive(m.to));

  return (
    <div className="lg:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-1 rounded-full bg-sidebar-deep text-sidebar-deep-foreground px-2 py-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.45)]"
        role="navigation"
        aria-label="Bottom navigation"
      >
        {primary.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              search={search}
              resetScroll={false}
              aria-label={item.label}
              title={item.label}
              className={
                "grid place-items-center w-11 h-11 rounded-full transition-colors " +
                (active
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-deep-foreground/70 hover:text-sidebar-deep-foreground hover:bg-sidebar-deep-foreground/10")
              }
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="More menu"
              title="More"
              className={
                "grid place-items-center w-11 h-11 rounded-full transition-colors " +
                (moreActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-deep-foreground/70 hover:text-sidebar-deep-foreground hover:bg-sidebar-deep-foreground/10")
              }
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="bg-sidebar-deep text-sidebar-deep-foreground border-0 rounded-t-3xl max-h-[75vh] overflow-y-auto"
          >
            <SheetTitle className="text-sidebar-deep-foreground">{t("app.nav.settings")}</SheetTitle>
            <div className="grid grid-cols-3 gap-3 mt-4 pb-4">
              {more.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    search={search}
                    resetScroll={false}
                    onClick={() => setMoreOpen(false)}
                    className={
                      "flex flex-col items-center gap-2 rounded-2xl p-3 text-xs font-medium transition-colors " +
                      (active
                        ? "bg-primary text-primary-foreground"
                        : "bg-sidebar-deep-foreground/5 hover:bg-sidebar-deep-foreground/10")
                    }
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-center leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
