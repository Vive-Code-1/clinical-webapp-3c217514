import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/clinic-queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const searchSchema = z.object({ clinic: z.string().optional() });

export const Route = createFileRoute("/_authenticated/services")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Services — SANTÉ" }] }),
  component: ServicesPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  color: string;
  is_active: boolean;
  online_bookable: boolean;
  is_telehealth: boolean;
};

function ServicesPage() {
  const { clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const queryClient = useQueryClient();

  const services = useQuery({
    queryKey: ["all-services", activeClinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_types")
        .select("id, name, description, duration_minutes, price_cents, currency, color, is_active, online_bookable, is_telehealth")
        .eq("clinic_id", activeClinicId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as ServiceRow[];
    },
  });

  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [open, setOpen] = useState(false);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service removed.");
      queryClient.invalidateQueries({ queryKey: ["all-services", activeClinicId] });
      queryClient.invalidateQueries({ queryKey: ["clinic-services", activeClinicId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="px-8 py-10 max-w-4xl">
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Catalog</p>
            <h1 className="text-4xl font-extrabold tracking-tight">Services</h1>
            <p className="font-serif text-muted-foreground mt-2">Define what you offer, durations, and prices.</p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/10 hover:brightness-110"
          >
            + New service
          </button>
        </div>

        <div className="bg-card rounded-3xl ring-1 ring-border divide-y divide-border overflow-hidden">
          {services.isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {services.data?.length === 0 && (
            <p className="p-6 font-serif text-muted-foreground text-sm">No services yet.</p>
          )}
          {services.data?.map((s) => (
            <div key={s.id} className="p-5 flex items-center gap-4">
              <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: s.color }} />
              <div className="flex-1 min-w-0">
                <p className="font-bold">
                  {s.name}{" "}
                  {!s.is_active && <span className="text-xs font-semibold text-muted-foreground">(inactive)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.duration_minutes} min · {(s.price_cents / 100).toFixed(2)} {s.currency}
                  {s.online_bookable ? " · online bookable" : " · staff only"}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditing(s);
                  setOpen(true);
                }}
                className="text-sm font-bold text-primary hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete "${s.name}"?`)) del.mutate(s.id);
                }}
                className="text-sm font-bold text-destructive hover:underline"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      <ServiceDialog
        open={open}
        onOpenChange={setOpen}
        clinicId={activeClinicId}
        existing={editing}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["all-services", activeClinicId] });
          queryClient.invalidateQueries({ queryKey: ["clinic-services", activeClinicId] });
        }}
      />
    </AppShell>
  );
}

function ServiceDialog({
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">{label}</span>
      {children}
    </label>
  );
}
