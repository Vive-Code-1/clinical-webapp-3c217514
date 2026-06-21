import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CheckoutInput = { invoiceId: string; successUrl?: string; cancelUrl?: string };

function getOrigin(input?: CheckoutInput) {
  if (input?.successUrl) {
    try {
      return new URL(input.successUrl).origin;
    } catch {}
  }
  try {
    const req = getRequest();
    if (req) {
      const url = new URL(req.url);
      const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
      const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
      return `${proto}://${host}`;
    }
  } catch {}
  return "";
}

/**
 * Creates a Stripe Checkout Session for an invoice and returns the hosted URL.
 * Requires STRIPE_SECRET_KEY. Once that secret is set, this works end-to-end.
 */
export const createInvoiceCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CheckoutInput) => {
    if (!data?.invoiceId || typeof data.invoiceId !== "string") throw new Error("invoiceId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error(
        "Stripe is not configured yet. Add STRIPE_SECRET_KEY in project secrets to enable card payments.",
      );
    }

    const { supabase } = context;
    const { data: inv, error } = await supabase
      .from("invoices")
      .select(
        "id, invoice_number, currency, total_cents, amount_paid_cents, status, clinic_id, client:clinic_clients(full_name, email), items:invoice_items(description, quantity, unit_price_cents)",
      )
      .eq("id", data.invoiceId)
      .single();
    if (error || !inv) throw new Error(error?.message ?? "Invoice not found");

    const balance = (inv.total_cents ?? 0) - (inv.amount_paid_cents ?? 0);
    if (balance <= 0) throw new Error("This invoice has no outstanding balance.");

    const origin = getOrigin(data);
    const successUrl =
      data.successUrl ??
      `${origin}/invoices/${inv.id}?clinic=${inv.clinic_id}&checkout=success`;
    const cancelUrl =
      data.cancelUrl ?? `${origin}/invoices/${inv.id}?clinic=${inv.clinic_id}&checkout=cancelled`;

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(stripeKey);

    const currency = (inv.currency || "usd").toLowerCase();
    // Single line item for the outstanding balance keeps things simple and accurate.
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: (inv as any).client?.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: balance,
            product_data: {
              name: `Invoice ${inv.invoice_number}`,
              description: `Outstanding balance for invoice ${inv.invoice_number}`,
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        invoice_id: inv.id,
        clinic_id: inv.clinic_id,
        invoice_number: inv.invoice_number,
      },
      payment_intent_data: {
        metadata: { invoice_id: inv.id, clinic_id: inv.clinic_id },
      },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url, sessionId: session.id };
  });
