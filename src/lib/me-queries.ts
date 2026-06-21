import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveAssetUrl } from "./storage-uploads";

export const myProfileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["my-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, locale")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      const avatarSrc = await resolveAssetUrl(data?.avatar_url ?? null);
      return {
        id: data?.id ?? userId,
        full_name: data?.full_name ?? null,
        avatar_url: data?.avatar_url ?? null,
        avatar_src: avatarSrc,
        locale: data?.locale ?? null,
      };
    },
    staleTime: 60_000,
  });

export const clinicBrandingQuery = (clinicId: string) =>
  queryOptions({
    queryKey: ["clinic-branding-public", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("id, name, brand_color, logo_url")
        .eq("id", clinicId)
        .maybeSingle();
      if (error) throw error;
      const logoSrc = await resolveAssetUrl(data?.logo_url ?? null);
      return {
        id: data?.id ?? clinicId,
        name: data?.name ?? "",
        brand_color: data?.brand_color ?? "#16a34a",
        logo_url: data?.logo_url ?? null,
        logo_src: logoSrc,
      };
    },
    staleTime: 60_000,
  });
