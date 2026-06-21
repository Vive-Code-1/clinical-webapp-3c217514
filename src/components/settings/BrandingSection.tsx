import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Save, Palette } from "lucide-react";
import { getClinicBranding, updateClinicBranding, FONT_OPTIONS } from "@/lib/functions/branding";
import { useAppTranslation } from "@/lib/i18n/app-translations";
import { LayoutDensitySection } from "./LayoutDensitySection";
import { LogoUploader, useLogoPreview } from "./branding/LogoUploader";
import { BrandColorPicker, FontPicker, BrandLivePreview } from "./branding/ColorAndFontPickers";

export function BrandingSection({ clinicId }: { clinicId: string }) {
  const { t } = useAppTranslation();
  const fetchBranding = useServerFn(getClinicBranding);
  const updateBranding = useServerFn(updateClinicBranding);
  const qc = useQueryClient();

  const branding = useQuery({
    queryKey: ["clinic-branding", clinicId],
    queryFn: () => fetchBranding({ data: { clinicId } }),
  });

  const [name, setName] = useState("");
  const [color, setColor] = useState("#16a34a");
  const [font, setFont] = useState("inter");
  const [logoStored, setLogoStored] = useState<string | null>(null);
  const logoPreview = useLogoPreview(logoStored);

  useEffect(() => {
    if (branding.data) {
      setName(branding.data.name);
      setColor(branding.data.brand_color);
      setFont(branding.data.brand_font);
      setLogoStored(branding.data.logo_url);
    }
  }, [branding.data]);

  const mutation = useMutation({
    mutationFn: () =>
      updateBranding({
        data: {
          clinicId,
          name: name.trim() || undefined,
          brand_color: color,
          brand_font: font,
          logo_url: logoStored,
        },
      }),
    onSuccess: () => {
      toast.success(t("app.settings.saved"));
      qc.invalidateQueries({ queryKey: ["clinic-branding", clinicId] });
      qc.invalidateQueries({ queryKey: ["clinic-branding-public", clinicId] });
      qc.invalidateQueries({ queryKey: ["my-clinics"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });

  const fontStack = FONT_OPTIONS.find((f) => f.id === font)?.stack ?? FONT_OPTIONS[0].stack;

  return (
    <section className="rounded-2xl border border-border bg-card card-pop p-5 space-y-5">
      <header className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{t("app.settings.branding")}</h2>
      </header>

      <div>
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          {t("app.settings.clinicName")}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
          placeholder="My Clinic"
        />
      </div>

      <LogoUploader clinicId={clinicId} logoStored={logoStored} logoPreview={logoPreview} onChange={setLogoStored} />
      <BrandColorPicker color={color} onChange={setColor} />
      <FontPicker font={font} onChange={setFont} />
      <BrandLivePreview name={name} color={color} fontStack={fontStack} logoPreview={logoPreview} />

      <LayoutDensitySection clinicId={clinicId} />

      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
      >
        <Save className="w-4 h-4" /> {t("app.settings.save")}
      </button>
    </section>
  );
}
