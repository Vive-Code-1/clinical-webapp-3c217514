import { supabase } from "@/integrations/supabase/client";

const BRAND_BUCKET = "brand-assets";

/** Upload a file under {clinicId}/logo.{ext} and return its storage path. */
export async function uploadClinicLogo(clinicId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `clinic/${clinicId}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BRAND_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return `${BRAND_BUCKET}/${path}`;
}

/** Upload a file under user/{userId}/avatar.{ext} and return its storage path. */
export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `user/${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BRAND_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return `${BRAND_BUCKET}/${path}`;
}

/** Resolve a stored value (path like "brand-assets/foo.png" or an absolute URL) to a renderable URL. */
export async function resolveAssetUrl(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  if (/^https?:\/\//i.test(stored)) return stored;
  const [bucket, ...rest] = stored.split("/");
  if (!bucket || rest.length === 0) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(rest.join("/"), 60 * 60 * 24 * 7);
  if (error) return null;
  return data?.signedUrl ?? null;
}
