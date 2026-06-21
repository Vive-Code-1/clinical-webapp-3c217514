/**
 * Dashboard range types — shared across dashboard widgets.
 */
export const RANGES = ["today", "week", "month", "year"] as const;
export type Range = (typeof RANGES)[number];
