export const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7am → 6pm
export const HOUR_PX = 56;

const APPT_PALETTE = ["#CBEAFB", "#FFD7E3", "#C9EFD9", "#FEDEC4"] as const;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function paletteColor(id: string) {
  return APPT_PALETTE[hashId(id) % APPT_PALETTE.length]!;
}
