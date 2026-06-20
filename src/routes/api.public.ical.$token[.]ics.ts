import { createFileRoute } from "@tanstack/react-router";

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsDate(d: Date): string {
  // YYYYMMDDTHHMMSSZ
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export const Route = createFileRoute("/api/public/ical/$token[.]ics")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token;

        // UUID format check
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
          return new Response("Invalid token", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Look up profile by token
        const { data: profile, error: pErr } = await supabaseAdmin
          .from("profiles")
          // @ts-expect-error ical_token column added via migration; types not regenerated yet
          .select("id, full_name, ical_token")
          // @ts-expect-error
          .eq("ical_token", token)
          .maybeSingle();

        if (pErr || !profile) {
          return new Response("Not found", { status: 404 });
        }

        // Fetch all upcoming appointments for this practitioner (next 6 months)
        const from = new Date();
        from.setMonth(from.getMonth() - 1);
        const to = new Date();
        to.setMonth(to.getMonth() + 6);

        const { data: appts, error: aErr } = await supabaseAdmin
          .from("appointments")
          .select(
            "id, starts_at, ends_at, status, notes, guest_name, client_id, service_type_id",
          )
          .eq("practitioner_id", profile.id)
          .gte("starts_at", from.toISOString())
          .lte("starts_at", to.toISOString());

        if (aErr) {
          return new Response("Failed to load", { status: 500 });
        }

        // Fetch services + client names in parallel
        const serviceIds = Array.from(
          new Set((appts ?? []).map((a) => a.service_type_id).filter((v): v is string => !!v)),
        );
        const clientIds = Array.from(
          new Set((appts ?? []).map((a) => a.client_id).filter((v): v is string => !!v)),
        );

        const [servicesRes, clientsRes] = await Promise.all([
          serviceIds.length
            ? supabaseAdmin.from("service_types").select("id, name").in("id", serviceIds)
            : Promise.resolve({ data: [], error: null }),
          clientIds.length
            ? supabaseAdmin.from("profiles").select("id, full_name").in("id", clientIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        const serviceMap = new Map((servicesRes.data ?? []).map((s: any) => [s.id, s.name]));
        const clientMap = new Map((clientsRes.data ?? []).map((c: any) => [c.id, c.full_name]));

        const now = formatIcsDate(new Date());
        const lines: string[] = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//Helanthus//Calendar//EN",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          `X-WR-CALNAME:Helanthus — ${escapeIcs((profile as any).full_name || "Schedule")}`,
        ];

        for (const a of appts ?? []) {
          if (a.status === "cancelled" || a.status === "no_show") continue;
          const summary =
            (serviceMap.get(a.service_type_id ?? "") as string | undefined) || "Appointment";
          const who = (clientMap.get(a.client_id ?? "") as string | undefined) || a.guest_name || "";
          lines.push(
            "BEGIN:VEVENT",
            `UID:${a.id}@helanthus`,
            `DTSTAMP:${now}`,
            `DTSTART:${formatIcsDate(new Date(a.starts_at))}`,
            `DTEND:${formatIcsDate(new Date(a.ends_at))}`,
            `SUMMARY:${escapeIcs(who ? `${summary} — ${who}` : summary)}`,
            ...(a.notes ? [`DESCRIPTION:${escapeIcs(a.notes)}`] : []),
            `STATUS:${a.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
            "END:VEVENT",
          );
        }

        lines.push("END:VCALENDAR");
        const body = lines.join("\r\n");

        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'inline; filename="helanthus.ics"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      },
    },
  },
});
