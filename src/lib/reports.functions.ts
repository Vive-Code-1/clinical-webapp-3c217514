import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReportRange = "7d" | "30d" | "90d" | "1y";

export type ReportData = {
  range: ReportRange;
  startISO: string;
  endISO: string;
  currency: string;
  revenue: {
    totalCents: number;
    paidInvoices: number;
    outstandingCents: number;
    overdueCents: number;
    byDay: { date: string; cents: number }[];
  };
  appointments: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    scheduled: number;
    byDay: { date: string; count: number }[];
  };
  topServices: { name: string; count: number; revenueCents: number }[];
  topClients: { id: string; name: string; appointments: number; spentCents: number }[];
};

function rangeStart(range: ReportRange): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  switch (range) {
    case "7d":
      d.setDate(d.getDate() - 6);
      break;
    case "30d":
      d.setDate(d.getDate() - 29);
      break;
    case "90d":
      d.setDate(d.getDate() - 89);
      break;
    case "1y":
      d.setDate(d.getDate() - 364);
      break;
  }
  return d;
}

export const getClinicReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clinicId: string; range?: ReportRange }) => {
    if (!data?.clinicId) throw new Error("clinicId required");
    return { clinicId: data.clinicId, range: (data.range ?? "30d") as ReportRange };
  })
  .handler(async ({ data, context }): Promise<ReportData> => {
    const { supabase } = context;
    const start = rangeStart(data.range);
    const end = new Date();
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const [{ data: clinic }, { data: invoices }, { data: appts }, { data: items }] = await Promise.all([
      supabase.from("clinics").select("currency").eq("id", data.clinicId).maybeSingle(),
      supabase
        .from("invoices")
        .select(
          "id, status, total_cents, amount_paid_cents, paid_at, due_at, created_at, client_id, client:clinic_clients(id, full_name)",
        )
        .eq("clinic_id", data.clinicId)
        .gte("created_at", startISO),
      supabase
        .from("appointments")
        .select(
          "id, status, starts_at, client_id, service_type_id, service:service_types(name), client:clinic_clients(id, full_name)",
        )
        .eq("clinic_id", data.clinicId)
        .gte("starts_at", startISO)
        .lte("starts_at", endISO),
      supabase
        .from("invoice_items")
        .select(
          "id, line_total_cents, service_type_id, service:service_types(name), invoice:invoices!inner(clinic_id, status, paid_at, created_at)",
        )
        .eq("invoice.clinic_id", data.clinicId)
        .gte("invoice.created_at", startISO),
    ]);

    const currency = (clinic?.currency ?? "USD").toUpperCase();
    const invs = invoices ?? [];
    const apps = appts ?? [];
    const lineItems = items ?? [];

    // Revenue
    const paid = invs.filter((i: any) => i.status === "paid" || i.amount_paid_cents > 0);
    const totalCents = paid.reduce((s: number, i: any) => s + (i.amount_paid_cents ?? 0), 0);
    const outstandingCents = invs.reduce(
      (s: number, i: any) =>
        i.status === "void"
          ? s
          : s + Math.max(0, (i.total_cents ?? 0) - (i.amount_paid_cents ?? 0)),
      0,
    );
    const now = Date.now();
    const overdueCents = invs.reduce(
      (s: number, i: any) =>
        i.due_at &&
        new Date(i.due_at).getTime() < now &&
        i.status !== "paid" &&
        i.status !== "void"
          ? s + Math.max(0, (i.total_cents ?? 0) - (i.amount_paid_cents ?? 0))
          : s,
      0,
    );

    const byDayRev = new Map<string, number>();
    for (const inv of paid) {
      const when = (inv as any).paid_at ?? (inv as any).created_at;
      if (!when) continue;
      const key = new Date(when).toISOString().slice(0, 10);
      byDayRev.set(key, (byDayRev.get(key) ?? 0) + ((inv as any).amount_paid_cents ?? 0));
    }

    const byDayApt = new Map<string, number>();
    for (const a of apps) {
      const key = new Date((a as any).starts_at).toISOString().slice(0, 10);
      byDayApt.set(key, (byDayApt.get(key) ?? 0) + 1);
    }

    // Fill missing days
    const allDays: string[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      allDays.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }

    // Top services by appointment + revenue
    const svcAgg = new Map<string, { name: string; count: number; revenueCents: number }>();
    for (const a of apps) {
      const s = (a as any).service;
      const name = s?.name ?? "Untitled";
      const e = svcAgg.get(name) ?? { name, count: 0, revenueCents: 0 };
      e.count += 1;
      svcAgg.set(name, e);
    }
    for (const li of lineItems) {
      const s = (li as any).service;
      const name = s?.name ?? "Other";
      const e = svcAgg.get(name) ?? { name, count: 0, revenueCents: 0 };
      e.revenueCents += (li as any).line_total_cents ?? 0;
      svcAgg.set(name, e);
    }

    // Top clients
    const cliAgg = new Map<string, { id: string; name: string; appointments: number; spentCents: number }>();
    for (const a of apps) {
      const c = (a as any).client;
      if (!c) continue;
      const e = cliAgg.get(c.id) ?? { id: c.id, name: c.full_name, appointments: 0, spentCents: 0 };
      e.appointments += 1;
      cliAgg.set(c.id, e);
    }
    for (const inv of paid) {
      const c = (inv as any).client;
      if (!c) continue;
      const e = cliAgg.get(c.id) ?? { id: c.id, name: c.full_name, appointments: 0, spentCents: 0 };
      e.spentCents += (inv as any).amount_paid_cents ?? 0;
      cliAgg.set(c.id, e);
    }

    return {
      range: data.range,
      startISO,
      endISO,
      currency,
      revenue: {
        totalCents,
        paidInvoices: paid.length,
        outstandingCents,
        overdueCents,
        byDay: allDays.map((d) => ({ date: d, cents: byDayRev.get(d) ?? 0 })),
      },
      appointments: {
        total: apps.length,
        completed: apps.filter((a: any) => a.status === "completed").length,
        cancelled: apps.filter((a: any) => a.status === "cancelled").length,
        noShow: apps.filter((a: any) => a.status === "no_show").length,
        scheduled: apps.filter((a: any) => a.status === "scheduled" || a.status === "confirmed").length,
        byDay: allDays.map((d) => ({ date: d, count: byDayApt.get(d) ?? 0 })),
      },
      topServices: Array.from(svcAgg.values())
        .sort((a, b) => b.count - a.count || b.revenueCents - a.revenueCents)
        .slice(0, 8),
      topClients: Array.from(cliAgg.values())
        .sort((a, b) => b.appointments - a.appointments || b.spentCents - a.spentCents)
        .slice(0, 8),
    };
  });
