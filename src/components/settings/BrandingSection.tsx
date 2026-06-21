import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Save, Palette, Type, ImageIcon, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getClinicBranding, updateClinicBranding, FONT_OPTIONS } from "@/lib/functions/branding";
import { uploadClinicLogo } from "@/lib/utils/storage-uploads";
import { useAppTranslation } from "@/lib/i18n/app-translations";
import { LayoutDensitySection } from "./LayoutDensitySection";

const PRESET_COLORS = ["#16a34a", "#0ea5e9", "#7c3aed", "#db2777", "#f59e0b", "#0f766e", "#1f2937"];

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
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (branding.data) {
      setName(branding.data.name);
      setColor(branding.data.brand_color);
      setFont(branding.data.brand_font);
      setLogoStored(branding.data.logo_url);
    }
  }, [branding.data]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!logoStored) {
        setLogoPreview(null);
        return;
      }
      if (/^https?:\/\//i.test(logoStored)) {
        setLogoPreview(logoStored);
        return;
      }
      const [bucket, ...rest] = logoStored.split("/");
      if (!bucket || rest.length === 0) return;
      const { data } = await supabase.storage.from(bucket).createSignedUrl(rest.join("/"), 60 * 60);
      if (!cancelled) setLogoPreview(data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [logoStored]);

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

  const handleLogoPick = async (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) {
      toast.error(t("app.settings.imageOnly"));
      return;
    }
    setUploadingLogo(true);
    try {
      const path = await uploadClinicLogo(clinicId, file);
      setLogoStored(path);
      toast.success(t("app.settings.saved"));
    } catch (e: any) {
      toast.error(e?.message ?? t("app.settings.uploadError"));
    } finally {
      setUploadingLogo(false);
    }
  };

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

      <div>
        <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
          <ImageIcon className="w-3.5 h-3.5" /> {t("app.settings.logo")}
        </label>
        <div className="mt-2 flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border border-border bg-muted/30 grid place-items-center overflow-hidden">
            {logoPreview ? (
              <img src={logoPreview} alt="" className="w-full h-full object-contain" />
            ) : (
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <input
            ref={logoInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleLogoPick(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => logoInput.current?.click()}
            disabled={uploadingLogo}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {uploadingLogo
              ? t("app.settings.uploading")
              : logoStored
                ? t("app.settings.replaceLogo")
                : t("app.settings.uploadLogo")}
          </button>
          {logoStored && (
            <button
              type="button"
              onClick={() => setLogoStored(null)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium text-destructive"
            >
              <Trash2 className="w-4 h-4" /> {t("app.settings.removeLogo")}
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          {t("app.settings.brandColor")}
        </label>
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-12 h-10 rounded border border-border cursor-pointer"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-32 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
            maxLength={7}
          />
          <div className="flex items-center gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 ${
                  color.toLowerCase() === c ? "border-foreground" : "border-transparent"
                }`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
          <Type className="w-3.5 h-3.5" /> {t("app.settings.typography")}
        </label>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {FONT_OPTIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFont(f.id)}
              className={`p-3 rounded-xl border text-left transition-colors ${
                font === f.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
              }`}
              style={{ fontFamily: f.stack }}
            >
              <div className="text-base font-semibold">{f.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">The quick brown fox</div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border p-4" style={{ fontFamily: fontStack, borderColor: color }}>
        <div className="text-xs uppercase font-semibold text-muted-foreground mb-2">
          {t("app.settings.livePreview")}
        </div>
        <div className="flex items-center gap-3">
          {logoPreview ? (
            <img src={logoPreview} alt="" className="h-8 w-8 rounded object-contain" />
          ) : (
            <div
              className="h-8 w-8 rounded grid place-items-center text-white text-sm font-bold"
              style={{ background: color }}
            >
              {name.charAt(0).toUpperCase() || "C"}
            </div>
          )}
          <div>
            <div className="text-lg font-bold" style={{ color }}>
              {name || "Your clinic"}
            </div>
            <div className="text-sm text-muted-foreground">
              Sample appointment header — Mar 12, 2:30 PM
            </div>
          </div>
        </div>
      </div>

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
