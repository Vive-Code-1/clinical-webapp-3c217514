import { Link } from "@tanstack/react-router";
import { useAppTranslation } from "@/lib/i18n/app-translations";
import { RANGES, type Range } from "./types";

/**
 * Pill-style range switcher (today / week / month / year).
 * Linked to `/dashboard?range=…` so URL is the single source of truth.
 */
export function RangePicker({
  current,
  fill,
  paddingX,
  paddingY,
}: {
  current: Range;
  fill?: boolean;
  paddingX?: number;
  paddingY?: number;
}) {
  const { t } = useAppTranslation();
  const labels: Record<Range, string> = {
    today: t("app.dashboard.today"),
    week: t("app.dashboard.week"),
    month: t("app.dashboard.month"),
    year: t("app.dashboard.year"),
  };
  const linkStyle =
    paddingX != null || paddingY != null
      ? { paddingLeft: paddingX, paddingRight: paddingX, paddingTop: paddingY, paddingBottom: paddingY }
      : undefined;
  return (
    <div
      className={`${fill ? "flex w-full sm:inline-flex sm:w-auto" : "inline-flex"} items-center gap-0.5 bg-card rounded-full p-1 ring-1 ring-border text-[10px] sm:text-xs font-medium`}
    >
      {RANGES.map((r) => (
        <Link
          key={r}
          to="/dashboard"
          search={{ range: r }}
          resetScroll={false}
          style={linkStyle}
          className={`${fill ? "flex-1 sm:flex-none text-center" : ""} ${linkStyle ? "" : "px-2 sm:px-3 py-1 sm:py-1.5"} rounded-full transition-colors whitespace-nowrap ${
            r === current
              ? "bg-pill-green text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {labels[r]}
        </Link>
      ))}
    </div>
  );
}
