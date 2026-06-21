import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function getOrigin(fallback?: string) {
  if (fallback) {
    try {
      return new URL(fallback).origin;
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

async function getStripe() {
  const { getAppSecret } = await import("@/lib/app-secrets.server");
  const key = await getAppSecret("STRIPE_SECRET_KEY");
  if (!key) {
    throw new Error(
      "Stripe is not configured yet. Add STRIPE_SECRET_KEY in Integrations to enable saved cards.",
    );
  }
  const { default: Stripe } = await import("stripe");
  return new Stripe(key);
}

async function getOrCreateCustomer(
  stripe: any,
  supabase: any,
  clinicId: string,
  clientId: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("saved_payment_methods")
    .select("stripe_customer_id")
    .eq("clinic_id", clinicId)
    .eq("client_id", clientId)
    .limit(1)
    .maybeSingle();
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const { data: client } = await supabase
    .from("clinic_clients")
    .select("full_name, email, phone")
    .eq("id", clientId)
    .maybeSingle();

  const customer = await stripe.customers.create({
    name: client?.full_name ?? undefined,
    email: client?.email ?? undefined,
    phone: client?.phone ?? undefined,
    metadata: { clinic_id: clinicId, client_id: clientId },
  });
  return customer.id;
}

/** Resolve the "self" clinic_client record for the signed-in user (creates it on demand). */
async function resolveSelfClientId(supabase: any, clinicId: string): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_self_client_record", {
    _clinic_id: clinicId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Start a Stripe Checkout session in `setup` mode to securely capture a card. */
export const createCardSetupSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clinicId: string; clientId?: string; returnUrl?: string }) => {
    if (!d?.clinicId) throw new Error("clinicId required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const stripe = await getStripe();
    const { supabase } = context;
    const clientId = data.clientId ?? (await resolveSelfClientId(supabase, data.clinicId));
    const customerId = await getOrCreateCustomer(stripe, supabase, data.clinicId, clientId);

    const origin = getOrigin(data.returnUrl);
    const base = data.returnUrl ?? `${origin}/billing-settings?clinic=${data.clinicId}`;
    const sep = base.includes("?") ? "&" : "?";

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      payment_method_types: ["card"],
      success_url: `${base}${sep}setup={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}${sep}setup=cancelled`,
      metadata: { clinic_id: data.clinicId, client_id: clientId },
    });
    if (!session.url) throw new Error("Stripe did not return a setup URL");
    return { url: session.url };
  });

/** Confirm a completed setup session and persist the payment method. */
export const confirmCardSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string; clinicId: string; clientId?: string }) => d)
  .handler(async ({ data, context }) => {
    const stripe = await getStripe();
    const { supabase } = context;
    const session = await stripe.checkout.sessions.retrieve(data.sessionId, {
      expand: ["setup_intent"],
    });
    const si: any = session.setup_intent;
    const pmId = typeof si === "string" ? null : si?.payment_method;
    if (!pmId) throw new Error("No payment method on this session");
    const pm = await stripe.paymentMethods.retrieve(pmId as string);
    const customerId = (session.customer as string) ?? (pm.customer as string);

    const clientId =
      data.clientId ??
      (session.metadata?.client_id as string | undefined) ??
      (await resolveSelfClientId(supabase, data.clinicId));

    // First card becomes default.
    const { count } = await supabase
      .from("saved_payment_methods")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", data.clinicId)
      .eq("client_id", clientId);
    const isDefault = (count ?? 0) === 0;

    const { error } = await supabase.from("saved_payment_methods").upsert(
      {
        clinic_id: data.clinicId,
        client_id: clientId,
        stripe_customer_id: customerId,
        stripe_payment_method_id: pm.id,
        brand: pm.card?.brand ?? null,
        last4: pm.card?.last4 ?? null,
        exp_month: pm.card?.exp_month ?? null,
        exp_year: pm.card?.exp_year ?? null,
        is_default: isDefault,
      },
      { onConflict: "clinic_id,stripe_payment_method_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setDefaultCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: card, error } = await supabase
      .from("saved_payment_methods")
      .select("clinic_id, client_id")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    await supabase
      .from("saved_payment_methods")
      .update({ is_default: false })
      .eq("clinic_id", card.clinic_id)
      .eq("client_id", card.client_id);
    const { error: e2 } = await supabase
      .from("saved_payment_methods")
      .update({ is_default: true })
      .eq("id", data.id);
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

export const deleteSavedCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: card, error } = await supabase
      .from("saved_payment_methods")
      .select("stripe_payment_method_id, is_default, clinic_id, client_id")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    try {
      const stripe = await getStripe();
      await stripe.paymentMethods.detach(card.stripe_payment_method_id);
    } catch {
      // ignore; row still removed
    }
    await supabase.from("saved_payment_methods").delete().eq("id", data.id);
    if (card.is_default) {
      const { data: next } = await supabase
        .from("saved_payment_methods")
        .select("id")
        .eq("clinic_id", card.clinic_id)
        .eq("client_id", card.client_id)
        .limit(1)
        .maybeSingle();
      if (next?.id) {
        await supabase
          .from("saved_payment_methods")
          .update({ is_default: true })
          .eq("id", next.id);
      }
    }
    return { ok: true };
  });

/** One-click charge: bills the invoice using a saved card (off-session). */
export const chargeInvoiceWithSavedCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { invoiceId: string; paymentMethodId?: string }) => d)
  .handler(async ({ data, context }) => {
    const stripe = await getStripe();
    const { supabase } = context;

    const { data: inv, error } = await supabase
      .from("invoices")
      .select(
        "id, invoice_number, currency, total_cents, amount_paid_cents, status, clinic_id, client_id",
      )
      .eq("id", data.invoiceId)
      .single();
    if (error || !inv) throw new Error(error?.message ?? "Invoice not found");
    if (!inv.client_id) throw new Error("Invoice has no client");
    const balance = (inv.total_cents ?? 0) - (inv.amount_paid_cents ?? 0);
    if (balance <= 0) throw new Error("This invoice has no outstanding balance.");

    // Resolve the card to charge.
    let cardQuery = supabase
      .from("saved_payment_methods")
      .select("id, stripe_customer_id, stripe_payment_method_id")
      .eq("clinic_id", inv.clinic_id)
      .eq("client_id", inv.client_id);
    if (data.paymentMethodId) {
      cardQuery = cardQuery.eq("id", data.paymentMethodId);
    } else {
      cardQuery = cardQuery.eq("is_default", true);
    }
    const { data: card, error: cErr } = await cardQuery.maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!card) throw new Error("No saved card on file for this client.");

    let pi;
    try {
      pi = await stripe.paymentIntents.create({
        amount: balance,
        currency: (inv.currency || "usd").toLowerCase(),
        customer: card.stripe_customer_id,
        payment_method: card.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        description: `Invoice ${inv.invoice_number}`,
        metadata: {
          invoice_id: inv.id,
          clinic_id: inv.clinic_id,
        },
      });
    } catch (e: any) {
      // Card needs authentication or was declined.
      const code = e?.code ?? e?.raw?.code;
      throw new Error(
        code === "authentication_required"
          ? "This card requires authentication. Ask the client to pay via the Stripe checkout link instead."
          : e?.message ?? "Card was declined",
      );
    }

    if (pi.status !== "succeeded") {
      throw new Error(`Payment not completed (status: ${pi.status})`);
    }

    // Record the payment locally (RLS allows clinic members).
    const { error: payErr } = await supabase.from("payments").insert({
      invoice_id: inv.id,
      clinic_id: inv.clinic_id,
      amount_cents: balance,
      method: "card",
      reference: pi.id,
    });
    if (payErr) throw new Error(payErr.message);

    return { ok: true, paymentIntentId: pi.id };
  });
