import { format, addMinutes, addDays, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export async function computeSlots(args: {
  clinicId: string;
  practitionerId: string;
  date: Date;
  durationMinutes: number;
}): Promise<Date[]> {
  const { clinicId, practitionerId, date, durationMinutes } = args;
  const dayCode = DAY_CODES[date.getDay()]!;
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);

  const [rulesRes, overridesRes, apptsRes] = await Promise.all([
    supabase
      .from("public_availability_rules")
      .select("start_time, end_time")
      .eq("practitioner_id", practitionerId)
      .eq("clinic_id", clinicId)
      .eq("day_of_week", dayCode)
      .eq("is_active", true),
    supabase
      .from("public_availability_overrides")
      .select("is_closed, start_time, end_time")
      .eq("practitioner_id", practitionerId)
      .eq("clinic_id", clinicId)
      .eq("override_date", format(date, "yyyy-MM-dd")),
    supabase
      .from("appointments")
      .select("starts_at, ends_at, status")
      .eq("practitioner_id", practitionerId)
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString()),
  ]);
  if (rulesRes.error) throw rulesRes.error;
  if (overridesRes.error) throw overridesRes.error;
  if (apptsRes.error) throw apptsRes.error;

  const overrides = overridesRes.data ?? [];
  if (overrides.some((o) => o.is_closed)) return [];

  const windows: { start: Date; end: Date }[] = [];
  const pushWindow = (st: string, et: string) => {
    const [sh, sm] = st.split(":").map(Number);
    const [eh, em] = et.split(":").map(Number);
    const s = new Date(date);
    s.setHours(sh!, sm!, 0, 0);
    const e = new Date(date);
    e.setHours(eh!, em!, 0, 0);
    windows.push({ start: s, end: e });
  };
  if (overrides.length > 0) {
    overrides.forEach((o) => o.start_time && o.end_time && pushWindow(o.start_time, o.end_time));
  } else {
    (rulesRes.data ?? []).forEach((r) => pushWindow(r.start_time, r.end_time));
  }

  const busy = (apptsRes.data ?? [])
    .filter((a) => a.status !== "cancelled" && a.status !== "no_show")
    .map((a) => ({ s: new Date(a.starts_at), e: new Date(a.ends_at) }));

  const now = new Date();
  const generated: Date[] = [];
  for (const w of windows) {
    let t = new Date(w.start);
    while (addMinutes(t, durationMinutes) <= w.end) {
      const slotEnd = addMinutes(t, durationMinutes);
      const overlaps = busy.some((b) => t < b.e && slotEnd > b.s);
      if (!overlaps && t > now) generated.push(new Date(t));
      t = addMinutes(t, 30);
    }
  }
  return generated;
}
