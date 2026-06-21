import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { DENSITY_PRESETS, getDensity, setDensity, type DensityPreset, type LayoutDensity } from "@/lib/utils/layout-density";

export function LayoutDensitySection({ clinicId }: { clinicId: string }) {
  const [density, setDensityState] = useState<LayoutDensity>(() => getDensity(clinicId));

  useEffect(() => {
    setDensityState(getDensity(clinicId));
  }, [clinicId]);

  const updateDensity = (next: LayoutDensity) => {
    setDensityState(next);
    setDensity(clinicId, next);
  };

  const applyPreset = (p: DensityPreset) => updateDensity(DENSITY_PRESETS[p]);

  return (
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
  );
}
