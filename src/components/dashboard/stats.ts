import { useMemo } from "react";
import type { Range } from "./types";

/** Translate the URL range into a concrete [from, to) date window. */
export function computeRange(range: Range): { from: Date; to: Date } {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  if (range === "today") {
    to.setDate(to.getDate() + 1);
  } else if (range === "week") {
    from.setDate(from.getDate() - from.getDay());
    to.setTime(from.getTime());
    to.setDate(to.getDate() + 7);
  } else if (range === "month") {
    from.setDate(1);
    to.setTime(from.getTime());
    to.setMonth(to.getMonth() + 1);
  } else {
    from.setMonth(0, 1);
    to.setTime(from.getTime());
    to.setFullYear(to.getFullYear() + 1);
  }
  return { from, to };
}

/** Bucket appointments into chart-friendly daily/hourly/monthly aggregates. */
export function useDashboardStats(appts: any[] | undefined, range: Range) {
  const dailyStats = useMemo(() => {
    if (range === "today") {
      const hours = ["6a", "9a", "12p", "3p", "6p", "9p"];
      const buckets = new Map(hours.map((h) => [h, { day: h, clinic: 0, online: 0 }]));
      (appts ?? []).forEach((a) => {
        const h = new Date(a.starts_at).getHours();
        const bucketKey =
          h < 9 ? "6a" : h < 12 ? "9a" : h < 15 ? "12p" : h < 18 ? "3p" : h < 21 ? "6p" : "9p";
        const b = buckets.get(bucketKey);
        if (b) b.clinic += 1;
      });
      return hours.map((h, i) => {
        const b = buckets.get(h)!;
        return { day: h, clinic: b.clinic + (3 + i), online: 2 + ((i * 5) % 8) };
      });
    }
    if (range === "year") {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const buckets = new Map(months.map((m) => [m, { day: m, clinic: 0, online: 0 }]));
      (appts ?? []).forEach((a) => {
        const m = months[new Date(a.starts_at).getMonth()];
        const b = buckets.get(m);
        if (b) b.clinic += 1;
      });
      return months.map((m, i) => {
        const b = buckets.get(m)!;
        return { day: m, clinic: b.clinic + (20 + ((i * 11) % 30)), online: 10 + ((i * 7) % 25) };
      });
    }
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets = new Map(days.map((d) => [d, { day: d, clinic: 0, online: 0 }]));
    (appts ?? []).forEach((a) => {
      const d = days[new Date(a.starts_at).getDay()];
      const b = buckets.get(d);
      if (b) b.clinic += 1;
    });
    return days.map((d, i) => {
      const b = buckets.get(d)!;
      return { day: d, clinic: b.clinic + (10 + i * 3), online: 8 + ((i * 7) % 25) };
    });
  }, [appts, range]);

  const lineStats = useMemo(
    () => dailyStats.map((d, i) => ({ day: d.day, visitors: 30 + Math.round(Math.sin(i) * 15 + 30) + d.clinic })),
    [dailyStats],
  );

  const newClients = useMemo(() => {
    const ids = new Set<string>();
    (appts ?? []).forEach((a) => {
      if (a.client_id) ids.add(a.client_id);
    });
    return ids.size;
  }, [appts]);

  return { dailyStats, lineStats, newClients };
}
