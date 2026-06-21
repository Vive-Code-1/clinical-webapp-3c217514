import { Type } from "lucide-react";
import { FONT_OPTIONS } from "@/lib/functions/branding";
import { useAppTranslation } from "@/lib/i18n/app-translations";

const PRESET_COLORS = ["#16a34a", "#0ea5e9", "#7c3aed", "#db2777", "#f59e0b", "#0f766e", "#1f2937"];

export function BrandColorPicker({ color, onChange }: { color: string; onChange: (v: string) => void }) {
  const { t } = useAppTranslation();
  return (
    <div>
      <label className="text-xs font-semibold uppercase text-muted-foreground">
        {t("app.settings.brandColor")}
      </label>
      <div className="mt-2 flex items-center gap-3 flex-wrap">
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded border border-border cursor-pointer"
        />
        <input
          type="text"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-32 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
          maxLength={7}
        />
        <div className="flex items-center gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
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
  );
}

export function FontPicker({ font, onChange }: { font: string; onChange: (v: string) => void }) {
  const { t } = useAppTranslation();
  return (
    <div>
      <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
        <Type className="w-3.5 h-3.5" /> {t("app.settings.typography")}
      </label>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {FONT_OPTIONS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
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
  );
}

export function BrandLivePreview({
  name,
  color,
  fontStack,
  logoPreview,
}: {
  name: string;
  color: string;
  fontStack: string;
  logoPreview: string | null;
}) {
  const { t } = useAppTranslation();
  return (
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
  );
}
