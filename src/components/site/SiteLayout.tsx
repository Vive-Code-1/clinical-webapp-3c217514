import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
