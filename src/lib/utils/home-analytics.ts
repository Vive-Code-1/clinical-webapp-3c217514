import { supabase } from "@/integrations/supabase/client";

export type HomeEvent =
  | "cta_hero_primary"
  | "cta_hero_secondary"
  | "cta_pricing"
  | "cta_final_primary"
  | "cta_final_secondary"
  | "walkthrough_tab"
  | "faq_open"
  | "lead_submit"
  | "lead_submit_success"
  | "lead_submit_error";

export async function trackHomeEvent(
  event: HomeEvent,
  locale: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    const path =
      typeof window !== "undefined" ? window.location.pathname + window.location.search : null;
    // Fire-and-forget; do not block UX
    await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("home_analytics_events" as any)
      .insert({ event, locale, path, metadata });
  } catch (err) {
    // Silently swallow — analytics must never break UX
    if (typeof console !== "undefined") console.warn("[analytics]", event, err);
  }
}
