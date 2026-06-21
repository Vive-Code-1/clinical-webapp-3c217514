// Server-only helper: read an integration secret from env first, then from
// the app_secrets table (managed via /integrations page).
// IMPORTANT: this file must only be imported inside server function/route
// handlers (use `await import(...)`), never at module scope of a *.functions.ts
// file, because it pulls in the admin client.

export async function getAppSecret(key: string): Promise<string | null> {
  const envVal = process.env[key];
  if (envVal && envVal.length > 0) return envVal;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_secrets")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  const v = (data as any)?.value;
  return typeof v === "string" && v.length > 0 ? v : null;
}
