import { useEffect, useState } from "react";

export type DensityPreset = "compact" | "default" | "comfortable";

export type LayoutDensity = {
  preset: DensityPreset;
  bellSize: number; // px, 32-56
  pickerPaddingX: number; // px, 4-20
  pickerPaddingY: number; // px, 2-10
};

export const DENSITY_PRESETS: Record<DensityPreset, LayoutDensity> = {
  compact: { preset: "compact", bellSize: 32, pickerPaddingX: 6, pickerPaddingY: 3 },
  default: { preset: "default", bellSize: 40, pickerPaddingX: 12, pickerPaddingY: 6 },
  comfortable: { preset: "comfortable", bellSize: 48, pickerPaddingX: 16, pickerPaddingY: 8 },
};

const STORAGE_PREFIX = "layout-density:";
const EVENT_NAME = "layout-density-change";

export function getDensity(clinicId: string): LayoutDensity {
  if (typeof window === "undefined") return DENSITY_PRESETS.default;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + clinicId);
    if (!raw) return DENSITY_PRESETS.default;
    const parsed = JSON.parse(raw) as Partial<LayoutDensity>;
    return {
      preset: parsed.preset ?? "default",
      bellSize: parsed.bellSize ?? DENSITY_PRESETS.default.bellSize,
      pickerPaddingX: parsed.pickerPaddingX ?? DENSITY_PRESETS.default.pickerPaddingX,
      pickerPaddingY: parsed.pickerPaddingY ?? DENSITY_PRESETS.default.pickerPaddingY,
    };
  } catch {
    return DENSITY_PRESETS.default;
  }
}

export function setDensity(clinicId: string, density: LayoutDensity) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_PREFIX + clinicId, JSON.stringify(density));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { clinicId } }));
}

export function useLayoutDensity(clinicId: string): LayoutDensity {
  const [density, setLocal] = useState<LayoutDensity>(() => getDensity(clinicId));
  useEffect(() => {
    setLocal(getDensity(clinicId));
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as { clinicId?: string } | undefined;
      if (!detail?.clinicId || detail.clinicId === clinicId) {
        setLocal(getDensity(clinicId));
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_PREFIX + clinicId) setLocal(getDensity(clinicId));
    };
    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [clinicId]);
  return density;
}
