import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IntegrationStatus = {
  key: string;
  label: string;
  group: "payments" | "messaging" | "ai" | "email";
  required: boolean;
  configured: boolean;
  source: "env" | "db" | "none";
  hasValue: boolean;
  preview: string | null;
  docs?: string;
  description: string;
  secret: boolean; // true for tokens; false for non-secret like FROM_NUMBER
};

const DEFINITIONS: Omit<IntegrationStatus, "configured" | "source" | "hasValue" | "preview">[] = [
  {
    key: "STRIPE_SECRET_KEY",
    label: "Stripe secret key",
    group: "payments",
    required: true,
    docs: "https://dashboard.stripe.com/apikeys",
    description: "Enables card payments via Stripe Checkout. Use sk_test_… for testing, sk_live_… for production.",
    secret: true,
  },
  {
    key: "STRIPE_WEBHOOK_SECRET",
    label: "Stripe webhook signing secret",
    group: "payments",
    required: true,
    docs: "https://dashboard.stripe.com/webhooks",
    description: "Required to verify Stripe webhook calls. Webhook URL: /api/public/stripe/webhook, event: checkout.session.completed.",
    secret: true,
  },
  {
    key: "TWILIO_ACCOUNT_SID",
    label: "Twilio Account SID",
    group: "messaging",
    required: false,
    docs: "https://console.twilio.com/",
    description: "Used for SMS appointment reminders.",
    secret: true,
  },
  {
    key: "TWILIO_AUTH_TOKEN",
    label: "Twilio auth token",
    group: "messaging",
    required: false,
    docs: "https://console.twilio.com/",
    description: "Pairs with the Twilio Account SID above.",
    secret: true,
  },
  {
    key: "TWILIO_FROM_NUMBER",
    label: "Twilio from number",
    group: "messaging",
    required: false,
    description: "E.164 format (e.g. +15551234567). The number SMS will be sent from.",
    secret: false,
  },
  {
    key: "RESEND_API_KEY",
    label: "Resend API key",
    group: "email",
    required: false,
    docs: "https://resend.com/api-keys",
    description: "Used to send invoice and reminder emails from your domain.",
    secret: true,
  },
  {
    key: "LOVABLE_API_KEY",
    label: "Lovable AI key",
    group: "ai",
    required: false,
    description: "Powers the optional AI Scribe (audio → SOAP notes). Auto-provisioned.",
    secret: true,
  },
];

function maskPreview(value: string, isSecret: boolean): string {
  if (!isSecret) return value;
  if (value.length <= 8) return "•••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

async function assertOwner(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "owner",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: owners only");
}

/** Lists integration keys + whether each is configured (env OR app_secrets row). */
export const getIntegrationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IntegrationStatus[]> => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("app_secrets")
      .select("key,value")
      .in(
        "key",
        DEFINITIONS.map((d) => d.key),
      );
    const db = new Map<string, string>((rows ?? []).map((r: any) => [r.key, r.value]));

    return DEFINITIONS.map((d) => {
      const envVal = process.env[d.key];
      const dbVal = db.get(d.key);
      const value = (envVal && envVal.length > 0 ? envVal : dbVal) ?? "";
      const source: "env" | "db" | "none" =
        envVal && envVal.length > 0 ? "env" : dbVal ? "db" : "none";
      return {
        ...d,
        configured: value.length > 0,
        source,
        hasValue: value.length > 0,
        preview: value ? maskPreview(value, d.secret) : null,
      };
    });
  });

/** Owner-only: upsert (or delete with empty value) a secret in app_secrets. */
export const setIntegrationSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { key: string; value: string }) => {
    if (!data?.key || typeof data.key !== "string") throw new Error("key required");
    if (typeof data.value !== "string") throw new Error("value must be string");
    if (!DEFINITIONS.some((d) => d.key === data.key)) throw new Error("Unknown key");
    if (data.key === "LOVABLE_API_KEY") throw new Error("LOVABLE_API_KEY is auto-provisioned");
    if (data.value.length > 4096) throw new Error("Value too long");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.value.trim() === "") {
      const { error } = await supabaseAdmin.from("app_secrets").delete().eq("key", data.key);
      if (error) throw new Error(error.message);
      return { ok: true, cleared: true };
    }
    const { error } = await supabaseAdmin.from("app_secrets").upsert({
      key: data.key,
      value: data.value.trim(),
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true, cleared: false };
  });
