import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LanguageToggle } from "./LanguageToggle";
import { useAppTranslation } from "@/lib/app-translations";

export function SiteHeader() {
  const { t } = useAppTranslation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 backdrop-blur-md transition-colors ${
        scrolled ? "bg-background/85 border-b border-border" : "bg-background/60 border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-lg font-extrabold tracking-tight uppercase text-foreground">
            {t("brand")}
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/features" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
              {t("nav.features")}
            </Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
              {t("nav.pricing")}
            </Link>
            <Link to="/about" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
              {t("nav.about")}
            </Link>
            <Link to="/contact" className="hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
              {t("nav.contact")}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <Link to="/auth/sign-in" className="hidden sm:inline text-sm font-medium text-foreground/80 hover:text-foreground">
            {t("nav.signIn")}
          </Link>
          <Link
            to="/auth/sign-up"
            className="hidden sm:inline-flex bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold shadow-sm shadow-primary/10 hover:brightness-110 transition-all"
          >
            {t("nav.startTrial")}
          </Link>
        </div>
      </div>
    </nav>
  );
}
