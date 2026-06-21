import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
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
  HelpCircle,
  LogOut,
  Leaf,
  BarChart3,
} from "lucide-react";

type Props = {
  clinicId?: string;
  children: ReactNode;
};

export function AppShell({ clinicId, children }: Props) {
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
    { to: "/dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { to: "/calendar" as const, label: "Appointment", icon: CalendarDays },
    { to: "/clients" as const, label: "Clients", icon: Users },
    { to: "/services" as const, label: "Services", icon: Sparkles },
    { to: "/availability" as const, label: "Availability", icon: Clock },
    { to: "/locations" as const, label: "Locations", icon: MapPin },
    { to: "/forms" as const, label: "Forms", icon: ClipboardList },
    { to: "/invoices" as const, label: "Invoices", icon: Receipt },
    { to: "/messages" as const, label: "Messages", icon: MessageSquare },
    { to: "/billing-settings" as const, label: "Billing", icon: Settings },
    { to: "/integrations" as const, label: "Integrations", icon: Sparkles },
  ];

  const secondary = [
    { label: "Setting", icon: Settings },
    { label: "Help & Center", icon: HelpCircle },

  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex p-4 gap-4">
      <aside className="hidden md:flex w-64 shrink-0 flex-col rounded-3xl bg-sidebar-deep text-sidebar-deep-foreground px-5 py-6">
        <Link to="/" className="flex items-center gap-2 px-2 mb-10">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-sidebar-deep-foreground/10">
            <Leaf className="w-5 h-5" />
          </span>
          <span className="text-xl font-bold tracking-tight">Helanthus</span>
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                search={search}
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
          {secondary.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-deep-foreground/60 cursor-default"
              >
                <Icon className="w-[18px] h-[18px]" />
                {item.label}
              </div>
            );
          })}
        </nav>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-deep-foreground/70 hover:text-sidebar-deep-foreground hover:bg-sidebar-deep-foreground/5 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Logout
        </button>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
