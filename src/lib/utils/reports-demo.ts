import type { ReportData, ReportRange } from "./reports.functions";

const SERVICES = [
  "Initial Consultation",
  "Follow-up Session",
  "Couples Therapy",
  "Group Workshop",
  "Telehealth Visit",
  "Nutrition Coaching",
  "CBT Session",
  "Wellness Check-in",
];

const CLIENT_NAMES = [
  "Aisha Rahman",
  "Marcus Chen",
  "Priya Desai",
  "Daniel Okafor",
  "Sofia Romano",
  "Liam O'Connor",
  "Yuki Tanaka",
  "Noor Hassan",
];

// Simple seeded RNG so demo numbers are stable across renders
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function daysFor(range: ReportRange): number {
  return range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
}

export function buildDemoReport(range: ReportRange, currency = "USD"): ReportData {
  const days = daysFor(range);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const rand = mulberry32(0x5eed + days);

  const allDays: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    allDays.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }

  // Daily appointments: weekday boost, weekend dip, gentle upward trend
  const apptByDay = allDays.map((d, i) => {
    const dow = new Date(d).getDay();
    const weekendDip = dow === 0 || dow === 6 ? 0.4 : 1;
    const trend = 1 + i / (days * 4);
    const base = 4 + Math.floor(rand() * 6);
    const count = Math.max(0, Math.round(base * weekendDip * trend));
    return { date: d, count };
  });

  const totalAppts = apptByDay.reduce((s, d) => s + d.count, 0);
  const completed = Math.round(totalAppts * 0.78);
  const cancelled = Math.round(totalAppts * 0.08);
  const noShow = Math.round(totalAppts * 0.05);
  const scheduled = Math.max(0, totalAppts - completed - cancelled - noShow);

  // Daily revenue follows appointments, avg ticket ~ $95 (9500 cents)
  const avgTicket = 9500;
  const revByDay = apptByDay.map(({ date, count }) => {
    const wobble = 0.7 + rand() * 0.6;
    const cents = Math.round(count * avgTicket * 0.78 * wobble);
    return { date, cents };
  });
  const totalCents = revByDay.reduce((s, d) => s + d.cents, 0);
  const paidInvoices = Math.round(totalAppts * 0.78);
  const outstandingCents = Math.round(totalCents * 0.22);
  const overdueCents = Math.round(outstandingCents * 0.35);

  const topServices = SERVICES.slice(0, 6)
    .map((name, i) => {
      const count = Math.max(1, Math.round((totalAppts / 6) * (1.5 - i * 0.15) * (0.7 + rand() * 0.6)));
      return { name, count, revenueCents: count * (avgTicket + Math.round(rand() * 4000 - 2000)) };
    })
    .sort((a, b) => b.count - a.count);

  const topClients = CLIENT_NAMES.slice(0, 6)
    .map((name, i) => {
      const appointments = Math.max(1, Math.round((totalAppts / 12) * (1.4 - i * 0.12) * (0.7 + rand() * 0.6)));
      return {
        id: `demo-${i}`,
        name,
        appointments,
        spentCents: appointments * (avgTicket + Math.round(rand() * 3000)),
      };
    })
    .sort((a, b) => b.appointments - a.appointments);

  return {
    range,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    currency,
    revenue: {
      totalCents,
      paidInvoices,
      outstandingCents,
      overdueCents,
      byDay: revByDay,
    },
    appointments: {
      total: totalAppts,
      completed,
      cancelled,
      noShow,
      scheduled,
      byDay: apptByDay,
    },
    topServices,
    topClients,
  };
}

export function isEmptyReport(r: ReportData | undefined | null): boolean {
  if (!r) return true;
  // Treat the report as "empty" (worth showing the demo) whenever there are
  // no real appointments to chart, even if a stray invoice exists.
  return r.appointments.total === 0;
}
