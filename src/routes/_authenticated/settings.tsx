import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Save, Palette, Type, ImageIcon, Sparkles, Upload, Languages, User as UserIcon, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/queries/clinic";
import { clinicBrandingQuery, myProfileQuery } from "@/lib/queries/me";
import { getClinicBranding, updateClinicBranding, FONT_OPTIONS } from "@/lib/functions/branding";
import { ScribeDialog } from "@/components/scribe/ScribeDialog";
import { useAppTranslation } from "@/lib/i18n/app-translations";
import { supabase } from "@/integrations/supabase/client";
import { uploadClinicLogo, uploadUserAvatar } from "@/lib/utils/storage-uploads";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { SupportedLanguage } from "@/lib/i18n";
import { DENSITY_PRESETS, getDensity, setDensity, type DensityPreset, type LayoutDensity } from "@/lib/utils/layout-density";
import { Slider } from "@/components/ui/slider";

const searchSchema = z.object({ clinic: z.string().optional() });

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics, user: context.user };
  },
  head: () => ({ meta: [{ title: "Settings — Helanthus" }] }),
  component: SettingsPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

const PRESET_COLORS = ["#16a34a", "#0ea5e9", "#7c3aed", "#db2777", "#f59e0b", "#0f766e", "#1f2937"];

function SettingsPage() {
  const { clinics, user } = Route.useRouteContext();
  const search = Route.useSearch();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const fetchBranding = useServerFn(getClinicBranding);
  const updateBranding = useServerFn(updateClinicBranding);
  const qc = useQueryClient();
  const { t, i18n } = useAppTranslation();
  const currentLang = ((i18n.resolvedLanguage ?? "en").slice(0, 2)) as SupportedLanguage;

  const branding = useQuery({
    queryKey: ["clinic-branding", activeClinicId],
    queryFn: () => fetchBranding({ data: { clinicId: activeClinicId } }),
  });

  const profile = useQuery(myProfileQuery(user.id));

  const [name, setName] = useState("");
  const [color, setColor] = useState("#16a34a");
  const [font, setFont] = useState("inter");
  const [logoStored, setLogoStored] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [scribeOpen, setScribeOpen] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const [density, setDensityState] = useState<LayoutDensity>(() => getDensity(activeClinicId));

  useEffect(() => {
    setDensityState(getDensity(activeClinicId));
  }, [activeClinicId]);

  const updateDensity = (next: LayoutDensity) => {
    setDensityState(next);
    setDensity(activeClinicId, next);
  };

  const applyPreset = (p: DensityPreset) => updateDensity(DENSITY_PRESETS[p]);

  useEffect(() => {
    if (branding.data) {
      setName(branding.data.name);
      setColor(branding.data.brand_color);
      setFont(branding.data.brand_font);
      setLogoStored(branding.data.logo_url);
    }
  }, [branding.data]);

  // Resolve a renderable URL for whatever is stored (path or http url)
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
          clinicId: activeClinicId,
          name: name.trim() || undefined,
          brand_color: color,
          brand_font: font,
          logo_url: logoStored,
        },
      }),
    onSuccess: () => {
      toast.success(t("app.settings.saved"));
      qc.invalidateQueries({ queryKey: ["clinic-branding", activeClinicId] });
      qc.invalidateQueries({ queryKey: ["clinic-branding-public", activeClinicId] });
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
      const path = await uploadClinicLogo(activeClinicId, file);
      setLogoStored(path);
      toast.success(t("app.settings.saved"));
    } catch (e: any) {
      toast.error(e?.message ?? t("app.settings.uploadError"));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleAvatarPick = async (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 4 * 1024 * 1024) {
      toast.error(t("app.settings.imageOnly"));
      return;
    }
    setUploadingAvatar(true);
    try {
      const path = await uploadUserAvatar(user.id, file);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["my-profile", user.id] });
      toast.success(t("app.settings.saved"));
    } catch (e: any) {
      toast.error(e?.message ?? t("app.settings.uploadError"));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const fontStack = FONT_OPTIONS.find((f) => f.id === font)?.stack ?? FONT_OPTIONS[0].stack;
  const initials =
    (profile.data?.full_name ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("app.settings.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("app.settings.subtitle")}</p>
        </div>

        {/* Language */}
        <section className="rounded-2xl border border-border bg-card card-pop p-5 space-y-3">
          <header className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">{t("app.settings.language")}</h2>
          </header>
          <p className="text-sm text-muted-foreground">{t("app.settings.languageHelp")}</p>
          <div className="inline-flex rounded-xl border border-border bg-background p-1">
            {(["en", "fr"] as const).map((lng) => (
              <button
                key={lng}
                type="button"
                onClick={() => void i18n.changeLanguage(lng)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  currentLang === lng
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lng === "en" ? "English" : "Français"}
              </button>
            ))}
          </div>
        </section>

        {/* My profile / avatar */}
        <section className="rounded-2xl border border-border bg-card card-pop p-5 space-y-4">
          <header className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">{t("app.settings.profile")}</h2>
          </header>
          <p className="text-sm text-muted-foreground">{t("app.settings.profileHelp")}</p>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              {profile.data?.avatar_src && (
                <AvatarImage src={profile.data.avatar_src} alt={profile.data.full_name ?? ""} />
              )}
              <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <input
                ref={avatarInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleAvatarPick(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => avatarInput.current?.click()}
                disabled={uploadingAvatar}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {uploadingAvatar
                  ? t("app.settings.uploading")
                  : profile.data?.avatar_src
                    ? t("app.settings.replaceAvatar")
                    : t("app.settings.uploadAvatar")}
              </button>
            </div>
          </div>
        </section>

        {/* Branding */}
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

          {/* Layout density */}
          <div className="rounded-xl border border-border p-4 space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">Layout density</div>
              <p className="text-xs text-muted-foreground mt-1">
                Adjust the notification bell size and range picker padding on the dashboard header.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(["compact", "default", "comfortable"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`p-3 rounded-xl border text-left capitalize text-sm transition-colors ${
                    density.preset === p ? "border-primary bg-primary/5 font-semibold" : "border-border hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium">Bell button size</span>
                  <span className="text-muted-foreground tabular-nums">{density.bellSize}px</span>
                </div>
                <Slider
                  min={32}
                  max={56}
                  step={1}
                  value={[density.bellSize]}
                  onValueChange={(v) => updateDensity({ ...density, preset: "default", bellSize: v[0] })}
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium">Range picker horizontal padding</span>
                  <span className="text-muted-foreground tabular-nums">{density.pickerPaddingX}px</span>
                </div>
                <Slider
                  min={4}
                  max={20}
                  step={1}
                  value={[density.pickerPaddingX]}
                  onValueChange={(v) => updateDensity({ ...density, preset: "default", pickerPaddingX: v[0] })}
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium">Range picker vertical padding</span>
                  <span className="text-muted-foreground tabular-nums">{density.pickerPaddingY}px</span>
                </div>
                <Slider
                  min={2}
                  max={12}
                  step={1}
                  value={[density.pickerPaddingY]}
                  onValueChange={(v) => updateDensity({ ...density, preset: "default", pickerPaddingY: v[0] })}
                />
              </div>
            </div>

            {/* Live preview */}
            <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-center justify-end gap-2">
              <div className="inline-flex items-center gap-0.5 bg-card rounded-full p-1 ring-1 ring-border text-xs font-medium">
                {(["Today", "Week", "Month", "Year"]).map((l, i) => (
                  <span
                    key={l}
                    style={{ paddingLeft: density.pickerPaddingX, paddingRight: density.pickerPaddingX, paddingTop: density.pickerPaddingY, paddingBottom: density.pickerPaddingY }}
                    className={`rounded-full ${i === 1 ? "bg-pill-green text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {l}
                  </span>
                ))}
              </div>
              <div
                style={{ width: density.bellSize, height: density.bellSize }}
                className="grid place-items-center rounded-full bg-card ring-1 ring-border"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              </div>
            </div>
          </div>


          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {t("app.settings.save")}
          </button>
        </section>

        {/* AI Scribe */}
        <section className="rounded-2xl border border-border bg-card card-pop p-5 space-y-3">
          <header className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">{t("app.settings.aiScribe")}</h2>
          </header>
          <p className="text-sm text-muted-foreground">{t("app.settings.aiScribeBody")}</p>
          <button
            type="button"
            onClick={() => setScribeOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium"
          >
            <Sparkles className="w-4 h-4" /> {t("app.settings.openScribe")}
          </button>
        </section>
      </div>

      <ScribeDialog open={scribeOpen} onClose={() => setScribeOpen(false)} />
    </AppShell>
  );
}
