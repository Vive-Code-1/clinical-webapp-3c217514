import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field } from "./Field";
import type { ServiceRow } from "./types";

export function ServiceDialog({
  open,
  onOpenChange,
  clinicId,
  existing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clinicId: string;
  existing: ServiceRow | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [duration, setDuration] = useState(existing?.duration_minutes ?? 60);
  const [price, setPrice] = useState(((existing?.price_cents ?? 0) / 100).toString());
  const [currency, setCurrency] = useState(existing?.currency ?? "CAD");
  const [color, setColor] = useState(existing?.color ?? "#7A5C3A");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [onlineBookable, setOnlineBookable] = useState(existing?.online_bookable ?? true);
  const [isTelehealth, setIsTelehealth] = useState(existing?.is_telehealth ?? false);
  const [isActive, setIsActive] = useState(existing?.is_active ?? true);
  const [err, setErr] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        clinic_id: clinicId,
        name,
        description: description || null,
        duration_minutes: duration,
        price_cents: Math.round(parseFloat(price || "0") * 100),
        currency,
        color,
        online_bookable: onlineBookable,
        is_telehealth: isTelehealth,
        is_active: isActive,
      };
      if (existing) {
        const { error } = await supabase.from("service_types").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service_types").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(existing ? "Service updated." : "Service created.");
      onSaved();
      onOpenChange(false);
    },
    onError: (e: Error) => setErr(e.message),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold tracking-tight">
            {existing ? "Edit service" : "New service"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Name">
            <input required value={name} onChange={(e) => setName(e.target.value)} className="inp" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration (min)">
              <input
                type="number"
                min={5}
                max={720}
                required
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value || "0", 10))}
                className="inp"
              />
            </Field>
            <Field label="Color">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="inp h-[42px] p-1" />
            </Field>
          </div>
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <Field label="Price">
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="inp"
              />
            </Field>
            <Field label="Currency">
              <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="inp" />
            </Field>
          </div>
          <Field label="Description">
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="inp" />
          </Field>
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={onlineBookable} onChange={(e) => setOnlineBookable(e.target.checked)} />
              Online bookable
            </label>
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={isTelehealth} onChange={(e) => setIsTelehealth(e.target.checked)} />
              Telehealth (video)
            </label>
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active
            </label>
          </div>
          {err && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{err}</div>}
          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-input hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={save.isPending}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/10 hover:brightness-110 disabled:opacity-60"
            >
              {save.isPending ? "Saving…" : "Save"}
            </button>
          </DialogFooter>
        </form>

        <style>{`.inp{width:100%;background:hsl(var(--background));border:1px solid hsl(var(--input));border-radius:0.75rem;padding:0.625rem 0.75rem;}`}</style>
      </DialogContent>
    </Dialog>
  );
}
