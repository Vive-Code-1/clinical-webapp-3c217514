import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const myClinicsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["my-clinics", userId],
    queryFn: async () => {
      // Fetch clinics where user is owner OR member
      const { data: owned, error: err1 } = await supabase
        .from("clinics")
        .select("id, name, slug, timezone, brand_color, is_active")
        .eq("owner_id", userId);
      if (err1) throw err1;

      const { data: memberships, error: err2 } = await supabase
        .from("clinic_members")
        .select("clinic:clinics(id, name, slug, timezone, brand_color, is_active), role")
        .eq("user_id", userId)
        .eq("is_active", true);
      if (err2) throw err2;

      const map = new Map<string, { id: string; name: string; slug: string; timezone: string; brand_color: string; role: string }>();
      (owned ?? []).forEach((c) => map.set(c.id, { ...c, role: "owner" }));
      (memberships ?? []).forEach((m) => {
        if (m.clinic && !map.has(m.clinic.id)) {
          map.set(m.clinic.id, { ...m.clinic, role: m.role });
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

export const clinicAppointmentsQuery = (clinicId: string, fromIso: string, toIso: string) =>
  queryOptions({
    queryKey: ["appointments", clinicId, fromIso, toIso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id, starts_at, ends_at, status, notes, color, practitioner_id, client_id, service_type_id, room_id, guest_name, service:service_types(name, color), practitioner_profile:profiles!appointments_practitioner_id_fkey(full_name), client_profile:profiles!appointments_client_id_fkey(full_name)",
        )
        .eq("clinic_id", clinicId)
        .gte("starts_at", fromIso)
        .lt("starts_at", toIso)
        .order("starts_at");
      if (error) throw error;
      return data ?? [];
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

export const clinicPractitionersQuery = (clinicId: string) =>
  queryOptions({
    queryKey: ["clinic-practitioners", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_members")
        .select("user_id, role, title, profile:profiles!clinic_members_user_id_fkey(full_name, avatar_url)")
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .in("role", ["owner", "practitioner"]);
      if (error) throw error;
      return data ?? [];
    },
  });
