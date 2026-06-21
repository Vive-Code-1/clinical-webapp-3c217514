import { createFileRoute } from "@tanstack/react-router";

// Public webhook for Stripe Checkout success.
// Verifies the Stripe signature using STRIPE_WEBHOOK_SECRET, then records a payment
// row for the matching invoice (idempotent via stripe_session_id unique index).
export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!stripeKey || !webhookSecret) {
          return new Response("Stripe not configured", { status: 503 });
        }
        const sig = request.headers.get("stripe-signature");
        if (!sig) return new Response("Missing signature", { status: 400 });

        const rawBody = await request.text();

        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(stripeKey);

        let event: Awaited<ReturnType<typeof stripe.webhooks.constructEventAsync>>;
        try {
          event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
        } catch (err) {
          console.error("[stripe webhook] signature verification failed", err);
          return new Response("Invalid signature", { status: 400 });
        }

        if (event.type !== "checkout.session.completed") {
          return new Response("ignored", { status: 200 });
        }

        const session = event.data.object as {
          id: string;
          amount_total: number | null;
          payment_intent: string | { id: string } | null;
          metadata: Record<string, string> | null;
        };
        const invoiceId = session.metadata?.invoice_id;
        const clinicId = session.metadata?.clinic_id;
        const amount = session.amount_total ?? 0;
        if (!invoiceId || !clinicId || !amount) {
          return new Response("Missing metadata", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: short-circuit if we've already inserted this session.
        const { data: existing } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("stripe_session_id", session.id)
          .maybeSingle();
        if (existing) return new Response("ok", { status: 200 });

        const { error } = await supabaseAdmin.from("payments").insert({
          invoice_id: invoiceId,
          clinic_id: clinicId,
          amount_cents: amount,
          method: "stripe",
          reference: session.id,
          stripe_session_id: session.id,
          stripe_payment_intent_id:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
        });
        if (error) {
          console.error("[stripe webhook] insert payment failed", error);
          return new Response("DB error", { status: 500 });
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
