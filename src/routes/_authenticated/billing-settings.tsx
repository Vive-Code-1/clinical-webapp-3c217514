import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/queries/clinic";
import { Trash2, CreditCard, Plus, Star } from "lucide-react";
import {
  createCardSetupSession,
  confirmCardSetup,
  setDefaultCard,
  deleteSavedCard,
} from "@/lib/functions/saved-cards";

const searchSchema = z.object({ clinic: z.string().optional(), setup: z.string().optional() });

export const Route = createFileRoute("/_authenticated/billing-settings")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Billing Settings — SANTÉ" }] }),
  component: BillingSettingsPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

type Tax = { id: string; name: string; rate_bps: number; is_default: boolean };
type Reminders = {
  email_enabled: boolean;
  sms_enabled: boolean;
  hours_before: number;
  send_confirmations: boolean;
  twilio_from: string | null;
};

function BillingSettingsPage() {
  const { clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const queryClient = useQueryClient();

  const taxes = useQuery({
    queryKey: ["taxes", activeClinicId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tax_rates")
        .select("id, name, rate_bps, is_default")
        .eq("clinic_id", activeClinicId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Tax[];
    },
  });

  const reminders = useQuery({
    queryKey: ["reminder-settings", activeClinicId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("reminder_settings")
        .select("email_enabled, sms_enabled, hours_before, send_confirmations, twilio_from")
        .eq("clinic_id", activeClinicId)
        .maybeSingle();
      if (error) throw error;
      return (data as Reminders | null) ?? {
        email_enabled: true,
        sms_enabled: false,
        hours_before: 24,
        send_confirmations: true,
        twilio_from: null,
      };
    },
  });

  const [taxName, setTaxName] = useState("");
  const [taxPct, setTaxPct] = useState("");

  const addTax = useMutation({
    mutationFn: async () => {
      const pct = parseFloat(taxPct);
      if (!taxName.trim() || isNaN(pct)) throw new Error("Enter name and rate");
      const { error } = await (supabase as any).from("tax_rates").insert({
        clinic_id: activeClinicId,
        name: taxName.trim(),
        rate_bps: Math.round(pct * 100),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tax added");
      setTaxName("");
      setTaxPct("");
      queryClient.invalidateQueries({ queryKey: ["taxes", activeClinicId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTax = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("tax_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      queryClient.invalidateQueries({ queryKey: ["taxes", activeClinicId] });
    },
  });

  const [rem, setRem] = useState<Reminders | null>(null);
  useEffect(() => {
    if (reminders.data) setRem(reminders.data);
  }, [reminders.data]);

  const saveReminders = useMutation({
    mutationFn: async () => {
      if (!rem) return;
      const { error } = await (supabase as any).from("reminder_settings").upsert({
        clinic_id: activeClinicId,
        ...rem,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Saved"),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="p-4 sm:p-6 md:p-8 max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">Billing settings</h1>
        <p className="text-muted-foreground mb-6">Tax rates and reminder configuration</p>

        <section className="rounded-2xl border border-border bg-card card-pop p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-semibold mb-1">Tax rates</h2>
          <p className="text-sm text-muted-foreground mb-4">Reusable rates applied to invoice line items.</p>

          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              addTax.mutate();
            }}
            className="flex flex-wrap gap-2 mb-4"
          >
            <input
              placeholder="Name (e.g. HST)"
              value={taxName}
              onChange={(e) => setTaxName(e.target.value)}
              className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
            <input
              type="number"
              step="0.01"
              placeholder="%"
              value={taxPct}
              onChange={(e) => setTaxPct(e.target.value)}
              className="w-20 px-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
            <button
              type="submit"
              disabled={addTax.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium shrink-0"
            >
              Add
            </button>
          </form>

          {taxes.data && taxes.data.length > 0 ? (
            <ul className="divide-y divide-border">
              {taxes.data.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-medium">{t.name}</span>
                    <span className="ml-2 text-muted-foreground text-sm">{(t.rate_bps / 100).toFixed(2)}%</span>
                  </div>
                  <button onClick={() => deleteTax.mutate(t.id)} className="text-destructive hover:opacity-70">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No tax rates yet.</p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card card-pop p-6">
          <h2 className="text-lg font-semibold mb-1">Appointment reminders</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Automated email and SMS sent before appointments. SMS requires Twilio (configure when ready).
          </p>

          {rem && (
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                saveReminders.mutate();
              }}
              className="space-y-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rem.email_enabled}
                  onChange={(e) => setRem({ ...rem, email_enabled: e.target.checked })}
                  className="rounded"
                />
                Send email reminders
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rem.sms_enabled}
                  onChange={(e) => setRem({ ...rem, sms_enabled: e.target.checked })}
                  className="rounded"
                />
                Send SMS reminders (requires Twilio)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rem.send_confirmations}
                  onChange={(e) => setRem({ ...rem, send_confirmations: e.target.checked })}
                  className="rounded"
                />
                Send booking confirmation immediately
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Hours before appointment</span>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={rem.hours_before}
                  onChange={(e) => setRem({ ...rem, hours_before: parseInt(e.target.value) || 24 })}
                  className="mt-1 w-32 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Twilio "from" phone number</span>
                <input
                  value={rem.twilio_from ?? ""}
                  onChange={(e) => setRem({ ...rem, twilio_from: e.target.value })}
                  placeholder="+1 555 123 4567"
                  className="mt-1 w-full max-w-xs px-3 py-2 rounded-lg border border-input bg-background text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={saveReminders.isPending}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
              >
                {saveReminders.isPending ? "Saving…" : "Save"}
              </button>
            </form>
          )}
        </section>

        <SavedCardsSection clinicId={activeClinicId} />
      </div>
    </AppShell>
  );
}

type SavedCard = {
  id: string;
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  is_default: boolean;
};

function SavedCardsSection({ clinicId }: { clinicId: string }) {
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const startSetup = useServerFn(createCardSetupSession);
  const confirmSetup = useServerFn(confirmCardSetup);
  const setDefault = useServerFn(setDefaultCard);
  const removeCard = useServerFn(deleteSavedCard);
  const [adding, setAdding] = useState(false);

  const cards = useQuery({
    queryKey: ["saved-cards", clinicId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("saved_payment_methods")
        .select("id, brand, last4, exp_month, exp_year, is_default")
        .eq("clinic_id", clinicId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavedCard[];
    },
  });

  useEffect(() => {
    if (!search.setup) return;
    if (search.setup === "cancelled") {
      toast.info("Card setup cancelled.");
      navigate({ search: (p: any) => ({ ...p, setup: undefined }), replace: true });
      return;
    }
    (async () => {
      try {
        await confirmSetup({ data: { sessionId: search.setup!, clinicId } });
        toast.success("Card saved.");
        queryClient.invalidateQueries({ queryKey: ["saved-cards", clinicId] });
      } catch (e: any) {
        toast.error(e?.message ?? "Could not save card");
      } finally {
        navigate({ search: (p: any) => ({ ...p, setup: undefined }), replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.setup]);

  const onAdd = async () => {
    try {
      setAdding(true);
      const res = await startSetup({
        data: {
          clinicId,
          returnUrl: window.location.href.split("?")[0] + `?clinic=${clinicId}`,
        },
      });
      if (res?.url) window.location.href = res.url;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start card setup");
      setAdding(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card card-pop p-6 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-lg font-semibold">Saved cards</h2>
        <button
          onClick={onAdd}
          disabled={adding}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
        >
          <Plus className="w-4 h-4" /> {adding ? "Opening…" : "Add card"}
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Securely stored with Stripe. Use one-click rebill on any invoice.
      </p>

      {cards.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : cards.data && cards.data.length > 0 ? (
        <ul className="divide-y divide-border">
          {cards.data.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-3 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <CreditCard className="w-5 h-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="font-medium capitalize truncate">
                    {c.brand ?? "Card"} •••• {c.last4 ?? "----"}
                    {c.is_default && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Expires {String(c.exp_month ?? "").padStart(2, "0")}/{c.exp_year ?? ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!c.is_default && (
                  <button
                    onClick={async () => {
                      try {
                        await setDefault({ data: { id: c.id } });
                        queryClient.invalidateQueries({ queryKey: ["saved-cards", clinicId] });
                        toast.success("Default updated");
                      } catch (e: any) {
                        toast.error(e?.message ?? "Failed");
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border hover:bg-muted"
                  >
                    <Star className="w-3 h-3" /> Make default
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (!confirm("Remove this card?")) return;
                    try {
                      await removeCard({ data: { id: c.id } });
                      queryClient.invalidateQueries({ queryKey: ["saved-cards", clinicId] });
                      toast.success("Removed");
                    } catch (e: any) {
                      toast.error(e?.message ?? "Failed");
                    }
                  }}
                  className="text-destructive hover:opacity-70 p-1"
                  aria-label="Delete card"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No saved cards yet. Add one to enable one-click rebilling.
        </p>
      )}
    </section>
  );
}
