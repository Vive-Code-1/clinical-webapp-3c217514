import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const myClinicsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["my-clinics", userId],
    queryFn: async () => {
      const { data: owned, error: err1 } = await supabase
        .from("clinics")
        .select("id, name, slug, timezone, brand_color, is_active")
        .eq("owner_id", userId);
      if (err1) throw err1;

      const { data: memberships, error: err2 } = await supabase
        .from("clinic_members")
        .select("role, clinics(id, name, slug, timezone, brand_color, is_active)")
        .eq("user_id", userId)
        .eq("is_active", true);
      if (err2) throw err2;

      const map = new Map<
        string,
        { id: string; name: string; slug: string; timezone: string; brand_color: string; role: string }
      >();
      (owned ?? []).forEach((c) => map.set(c.id, { ...c, role: "owner" }));
      (memberships ?? []).forEach((m) => {
        const c = m.clinics;
        if (c && !map.has(c.id)) {
          map.set(c.id, { ...c, role: m.role });
        }
      });
      return Array.from(map.values());
    },
  });

export const clinicBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["clinic-slug", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("id, name, slug, timezone, brand_color, logo_url, description")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export type CalendarAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  color: string | null;
  practitioner_id: string;
  client_id: string | null;
  service_type_id: string | null;
  room_id: string | null;
  guest_name: string | null;
  service: { name: string; color: string } | null;
  practitioner_name: string | null;
  client_name: string | null;
};

export const clinicAppointmentsQuery = (clinicId: string, fromIso: string, toIso: string) =>
  queryOptions({
    queryKey: ["appointments", clinicId, fromIso, toIso],
    queryFn: async (): Promise<CalendarAppointment[]> => {
      const { data: appts, error } = await supabase
        .from("appointments")
        .select(
          "id, starts_at, ends_at, status, notes, color, practitioner_id, client_id, service_type_id, room_id, guest_name, service:service_types(name, color)",
        )
        .eq("clinic_id", clinicId)
        .gte("starts_at", fromIso)
        .lt("starts_at", toIso)
        .order("starts_at");
      if (error) throw error;
      if (!appts || appts.length === 0) return [];

      const userIds = Array.from(
        new Set([
          ...appts.map((a) => a.practitioner_id),
          ...appts.map((a) => a.client_id).filter((v): v is string => !!v),
        ]),
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

      return appts.map((a) => ({
        ...a,
        practitioner_name: nameMap.get(a.practitioner_id) ?? null,
        client_name: a.client_id ? nameMap.get(a.client_id) ?? null : null,
      }));
    },
  });

export const clinicServicesQuery = (clinicId: string) =>
  queryOptions({
    queryKey: ["clinic-services", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_types")
        .select("id, name, duration_minutes, color, price_cents, currency, is_active")
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export type ClinicPractitioner = {
  user_id: string;
  role: string;
  title: string | null;
  full_name: string | null;
};

export const clinicPractitionersQuery = (clinicId: string) =>
  queryOptions({
    queryKey: ["clinic-practitioners", clinicId],
    queryFn: async (): Promise<ClinicPractitioner[]> => {
      const { data: members, error } = await supabase
        .from("clinic_members")
        .select("user_id, role, title")
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .in("role", ["owner", "practitioner"]);
      if (error) throw error;
      if (!members || members.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in(
          "id",
          members.map((m) => m.user_id),
        );
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

      return members.map((m) => ({
        user_id: m.user_id,
        role: m.role,
        title: m.title,
        full_name: nameMap.get(m.user_id) ?? null,
      }));
    },
  });
