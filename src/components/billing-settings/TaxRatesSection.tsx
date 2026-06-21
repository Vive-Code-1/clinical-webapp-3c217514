import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tax } from "./types";

export function TaxRatesSection({ clinicId }: { clinicId: string }) {
  const queryClient = useQueryClient();
  const [taxName, setTaxName] = useState("");
  const [taxPct, setTaxPct] = useState("");

  const taxes = useQuery({
    queryKey: ["taxes", clinicId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tax_rates")
        .select("id, name, rate_bps, is_default")
        .eq("clinic_id", clinicId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Tax[];
    },
  });

  const addTax = useMutation({
    mutationFn: async () => {
      const pct = parseFloat(taxPct);
      if (!taxName.trim() || isNaN(pct)) throw new Error("Enter name and rate");
      const { error } = await (supabase as any).from("tax_rates").insert({
        clinic_id: clinicId,
        name: taxName.trim(),
        rate_bps: Math.round(pct * 100),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tax added");
      setTaxName("");
      setTaxPct("");
      queryClient.invalidateQueries({ queryKey: ["taxes", clinicId] });
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
      queryClient.invalidateQueries({ queryKey: ["taxes", clinicId] });
    },
  });

  return (
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
  );
}
