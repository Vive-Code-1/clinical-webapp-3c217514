import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background py-16 px-6 mt-12">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 border-b border-background/10 pb-16">
        <div className="col-span-2">
          <span className="text-xl font-extrabold tracking-tight uppercase mb-6 block">
            {t("brand")}
          </span>
          <p className="max-w-xs text-background/60 font-serif">{t("footer.tagline")}</p>
        </div>
        <div>
          <h4 className="font-bold mb-6">{t("footer.product")}</h4>
          <ul className="space-y-4 text-sm text-background/60">
            <li>
              <Link to="/features" className="hover:text-background">{t("footer.links.scheduling")}</Link>
            </li>
            <li>
              <Link to="/features" className="hover:text-background">{t("footer.links.billing")}</Link>
            </li>
            <li>
              <Link to="/features" className="hover:text-background">{t("footer.links.telehealth")}</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-6">{t("footer.practice")}</h4>
          <ul className="space-y-4 text-sm text-background/60">
            <li>
              <Link to="/features" className="hover:text-background">{t("footer.links.solo")}</Link>
            </li>
            <li>
              <Link to="/features" className="hover:text-background">{t("footer.links.clinics")}</Link>
            </li>
            <li>
              <Link to="/features" className="hover:text-background">{t("footer.links.portal")}</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold tracking-widest uppercase text-background/40">
        <div className="flex gap-8">
          <a href="#">{t("footer.links.privacy")}</a>
          <a href="#">{t("footer.links.security")}</a>
          <a href="#">{t("footer.links.hipaa")}</a>
        </div>
        <div>{t("footer.rights", { year })}</div>
      </div>
    </footer>
  );
}
