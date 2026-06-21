import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2, CreditCard, Plus, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  createCardSetupSession,
  confirmCardSetup,
  setDefaultCard,
  deleteSavedCard,
} from "@/lib/functions/saved-cards";
import type { SavedCard } from "./types";

export function SavedCardsSection({
  clinicId,
  setupParam,
  clearSetupParam,
}: {
  clinicId: string;
  setupParam: string | undefined;
  clearSetupParam: () => void;
}) {
  const queryClient = useQueryClient();
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
    if (!setupParam) return;
    if (setupParam === "cancelled") {
      toast.info("Card setup cancelled.");
      clearSetupParam();
      return;
    }
    (async () => {
      try {
        await confirmSetup({ data: { sessionId: setupParam, clinicId } });
        toast.success("Card saved.");
        queryClient.invalidateQueries({ queryKey: ["saved-cards", clinicId] });
      } catch (e: any) {
        toast.error(e?.message ?? "Could not save card");
      } finally {
        clearSetupParam();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupParam]);

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
