import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const FONT_OPTIONS = [
  { id: "inter", label: "Inter", stack: '"Inter", system-ui, sans-serif' },
  { id: "manrope", label: "Manrope", stack: '"Manrope", system-ui, sans-serif' },
  { id: "dm-sans", label: "DM Sans", stack: '"DM Sans", system-ui, sans-serif' },
  { id: "playfair", label: "Playfair Display", stack: '"Playfair Display", Georgia, serif' },
  { id: "lora", label: "Lora", stack: '"Lora", Georgia, serif' },
  { id: "ibm-plex", label: "IBM Plex Sans", stack: '"IBM Plex Sans", system-ui, sans-serif' },
] as const;

export type ClinicBranding = {
  id: string;
  name: string;
  brand_color: string;
  brand_font: string;
  logo_url: string | null;
};

export const getClinicBranding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clinicId: string }) => {
    if (!data?.clinicId) throw new Error("clinicId required");
    return data;
  })
  .handler(async ({ data, context }): Promise<ClinicBranding> => {
    const { data: row, error } = await context.supabase
      .from("clinics")
      .select("id, name, brand_color, brand_font, logo_url")
      .eq("id", data.clinicId)
      .single();
    if (error) throw new Error(error.message);
    return row as ClinicBranding;
  });

export const updateClinicBranding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      clinicId: string;
      name?: string;
      brand_color?: string;
      brand_font?: string;
      logo_url?: string | null;
    }) => {
      if (!data?.clinicId) throw new Error("clinicId required");
      if (data.brand_color && !/^#[0-9a-fA-F]{6}$/.test(data.brand_color))
        throw new Error("brand_color must be a hex like #16a34a");
      if (data.brand_font && !FONT_OPTIONS.some((f) => f.id === data.brand_font))
        throw new Error("Unknown font");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, any> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.brand_color !== undefined) patch.brand_color = data.brand_color;
    if (data.brand_font !== undefined) patch.brand_font = data.brand_font;
    if (data.logo_url !== undefined) patch.logo_url = data.logo_url;
    const { error } = await context.supabase.from("clinics").update(patch as any).eq("id", data.clinicId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
