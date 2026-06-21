import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IntegrationStatus = {
  key: string;
  label: string;
  group: "payments" | "messaging" | "ai" | "email";
  required: boolean;
  configured: boolean;
  docs?: string;
  description: string;
};

/**
 * Reports which optional third-party keys are configured in the server env.
 * Only owners/practitioners can call this. We never reveal the actual values —
 * only whether the secret exists.
 */
export const getIntegrationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<IntegrationStatus[]> => {
    const has = (k: string) => {
      const v = process.env[k];
      return typeof v === "string" && v.length > 0;
    };

    return [
      {
        key: "STRIPE_SECRET_KEY",
        label: "Stripe secret key",
        group: "payments",
        required: true,
        configured: has("STRIPE_SECRET_KEY"),
        docs: "https://dashboard.stripe.com/apikeys",
        description:
          "Enables card payments via Stripe Checkout. Use sk_test_… for testing, sk_live_… for production.",
      },
      {
        key: "STRIPE_WEBHOOK_SECRET",
        label: "Stripe webhook signing secret",
        group: "payments",
        required: true,
        configured: has("STRIPE_WEBHOOK_SECRET"),
        docs: "https://dashboard.stripe.com/webhooks",
        description:
          "Required to verify Stripe webhook calls. Create a webhook endpoint pointing to /api/public/stripe/webhook for event checkout.session.completed.",
      },
      {
        key: "TWILIO_ACCOUNT_SID",
        label: "Twilio Account SID",
        group: "messaging",
        required: false,
        configured: has("TWILIO_ACCOUNT_SID"),
        docs: "https://console.twilio.com/",
        description: "Used for SMS appointment reminders.",
      },
      {
        key: "TWILIO_AUTH_TOKEN",
        label: "Twilio auth token",
        group: "messaging",
        required: false,
        configured: has("TWILIO_AUTH_TOKEN"),
        docs: "https://console.twilio.com/",
        description: "Pairs with the Twilio Account SID above.",
      },
      {
        key: "TWILIO_FROM_NUMBER",
        label: "Twilio from number",
        group: "messaging",
        required: false,
        configured: has("TWILIO_FROM_NUMBER"),
        description: "E.164 format (e.g. +15551234567). The number SMS will be sent from.",
      },
      {
        key: "RESEND_API_KEY",
        label: "Resend API key",
        group: "email",
        required: false,
        configured: has("RESEND_API_KEY"),
        docs: "https://resend.com/api-keys",
        description: "Used to send invoice and reminder emails from your domain.",
      },
      {
        key: "LOVABLE_API_KEY",
        label: "Lovable AI key",
        group: "ai",
        required: false,
        configured: has("LOVABLE_API_KEY"),
        description: "Powers the optional AI Scribe (audio → SOAP notes). Auto-provisioned.",
      },
    ];
  });
