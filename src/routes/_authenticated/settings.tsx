import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Save, Palette, Type, ImageIcon, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/clinic-queries";
import {
  getClinicBranding,
  updateClinicBranding,
  FONT_OPTIONS,
} from "@/lib/branding.functions";
import { ScribeDialog } from "@/components/scribe/ScribeDialog";

const searchSchema = z.object({ clinic: z.string().optional() });

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Settings — Helanthus" }] }),
  component: SettingsPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

const PRESET_COLORS = [
  "#16a34a",
  "#0ea5e9",
  "#7c3aed",
  "#db2777",
  "#f59e0b",
  "#0f766e",
  "#1f2937",
];

function SettingsPage() {
  const { clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const fetchBranding = useServerFn(getClinicBranding);
  const updateBranding = useServerFn(updateClinicBranding);
  const qc = useQueryClient();

  const branding = useQuery({
    queryKey: ["clinic-branding", activeClinicId],
    queryFn: () => fetchBranding({ data: { clinicId: activeClinicId } }),
  });

  const [name, setName] = useState("");
  const [color, setColor] = useState("#16a34a");
  const [font, setFont] = useState("inter");
  const [logoUrl, setLogoUrl] = useState("");
  const [scribeOpen, setScribeOpen] = useState(false);

  useEffect(() => {
    if (branding.data) {
      setName(branding.data.name);
      setColor(branding.data.brand_color);
      setFont(branding.data.brand_font);
      setLogoUrl(branding.data.logo_url ?? "");
    }
  }, [branding.data]);

  const mutation = useMutation({
    mutationFn: () =>
      updateBranding({
        data: {
          clinicId: activeClinicId,
          name: name.trim() || undefined,
          brand_color: color,
          brand_font: font,
          logo_url: logoUrl.trim() ? logoUrl.trim() : null,
        },
      }),
    onSuccess: () => {
      toast.success("Branding saved");
      qc.invalidateQueries({ queryKey: ["clinic-branding", activeClinicId] });
      qc.invalidateQueries({ queryKey: ["my-clinics"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });

  const fontStack =
    FONT_OPTIONS.find((f) => f.id === font)?.stack ?? FONT_OPTIONS[0].stack;

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="p-6 md:p-8 max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Clinic branding, typography, and AI tools.
          </p>
        </div>

        <section className="rounded-2xl border border-border bg-card card-pop p-5 space-y-5">
          <header className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Branding</h2>
          </header>

          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Clinic name
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
              <ImageIcon className="w-3.5 h-3.5" /> Logo URL (optional)
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
              placeholder="https://…/logo.png"
            />
            {logoUrl && (
              <div className="mt-2 flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="h-10 w-10 rounded object-contain bg-background"
                  onError={(e) => ((e.currentTarget.style.display = "none"))}
                />
                <span className="text-xs text-muted-foreground">Logo preview</span>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Brand color
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
              <Type className="w-3.5 h-3.5" /> Typography
            </label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFont(f.id)}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    font === f.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  }`}
                  style={{ fontFamily: f.stack }}
                >
                  <div className="text-base font-semibold">{f.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">The quick brown fox</div>
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl border border-border p-4"
            style={{ fontFamily: fontStack, borderColor: color }}
          >
            <div className="text-xs uppercase font-semibold text-muted-foreground mb-2">
              Live preview
            </div>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-8 w-8 rounded object-contain" />
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

          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save branding
          </button>
        </section>

        <section className="rounded-2xl border border-border bg-card card-pop p-5 space-y-3">
          <header className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">AI Scribe</h2>
          </header>
          <p className="text-sm text-muted-foreground">
            Paste raw session notes or a dictated transcript and get a clean SOAP note in seconds.
            Powered by Lovable AI — no extra setup required.
          </p>
          <button
            type="button"
            onClick={() => setScribeOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium"
          >
            <Sparkles className="w-4 h-4" /> Open AI Scribe
          </button>
        </section>
      </div>

      <ScribeDialog open={scribeOpen} onClose={() => setScribeOpen(false)} />
    </AppShell>
  );
}
