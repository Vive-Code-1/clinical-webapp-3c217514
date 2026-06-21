export type ExerciseRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  video_url: string | null;
  image_url: string | null;
  instructions: string | null;
  default_sets: number | null;
  default_reps: number | null;
  default_duration_seconds: number | null;
};

export function parseIntOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}
