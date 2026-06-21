import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/clinic-queries";

const searchSchema = z.object({ clinic: z.string().optional() });

const DAYS: { code: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"; label: string }[] = [
  { code: "mon", label: "Monday" },
  { code: "tue", label: "Tuesday" },
  { code: "wed", label: "Wednesday" },
  { code: "thu", label: "Thursday" },
  { code: "fri", label: "Friday" },
  { code: "sat", label: "Saturday" },
  { code: "sun", label: "Sunday" },
];

export const Route = createFileRoute("/_authenticated/availability")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Availability — SANTÉ" }] }),
  component: AvailabilityPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

type Rule = {
  id: string;
  day_of_week: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  start_time: string;
  end_time: string;
  is_active: boolean;
};

function AvailabilityPage() {
  const { user, clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const queryClient = useQueryClient();

  const rules = useQuery({
    queryKey: ["availability", activeClinicId, user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability_rules")
        .select("id, day_of_week, start_time, end_time, is_active")
        .eq("clinic_id", activeClinicId)
        .eq("practitioner_id", user.id)
        .order("day_of_week");
      if (error) throw error;
      return (data ?? []) as Rule[];
    },
  });

  const grouped = new Map<string, Rule[]>();
  for (const r of rules.data ?? []) {
    const arr = grouped.get(r.day_of_week) ?? [];
    arr.push(r);
    grouped.set(r.day_of_week, arr);
  }

  const addRule = useMutation({
    mutationFn: async (v: { day: Rule["day_of_week"]; start: string; end: string }) => {
      const { error } = await supabase.from("availability_rules").insert({
        clinic_id: activeClinicId,
        practitioner_id: user.id,
        day_of_week: v.day,
        start_time: v.start,
        end_time: v.end,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Hours added.");
      queryClient.invalidateQueries({ queryKey: ["availability", activeClinicId, user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("availability_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed.");
      queryClient.invalidateQueries({ queryKey: ["availability", activeClinicId, user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="px-8 py-10 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Schedule</p>
        <h1 className="text-4xl font-extrabold tracking-tight">My weekly availability</h1>
        <p className="font-serif text-muted-foreground mt-2 mb-8">
          Set the hours you are open for sessions. Online bookings will respect these windows.
        </p>

        <div className="bg-card rounded-3xl ring-1 ring-border card-pop divide-y divide-border overflow-hidden">
          {DAYS.map((d) => (
            <DayRow
              key={d.code}
              label={d.label}
              rules={grouped.get(d.code) ?? []}
              onAdd={(start, end) => addRule.mutate({ day: d.code, start, end })}
              onDelete={(id) => delRule.mutate(id)}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function DayRow({
  label,
  rules,
  onAdd,
  onDelete,
}: {
  label: string;
  rules: Rule[];
  onAdd: (start: string, end: string) => void;
  onDelete: (id: string) => void;
}) {
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onAdd(start, end);
  };

  return (
    <div className="p-5 flex flex-wrap items-center gap-3">
      <p className="w-full sm:w-28 font-bold">{label}</p>
      <div className="flex-1 flex flex-wrap gap-2 min-w-0 w-full sm:w-auto">
        {rules.length === 0 && <p className="text-sm font-serif text-muted-foreground italic">Closed</p>}
        {rules.map((r) => (
          <span
            key={r.id}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-xs font-mono font-semibold"
          >
            {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
            <button onClick={() => onDelete(r.id)} className="text-destructive hover:opacity-70" aria-label="Remove">
              ×
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={submit} className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="bg-background border border-input rounded-lg px-2 py-1.5 text-sm font-mono min-w-0 flex-1 sm:flex-none sm:w-auto"
        />
        <span className="text-muted-foreground">–</span>
        <input
          type="time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="bg-background border border-input rounded-lg px-2 py-1.5 text-sm font-mono min-w-0 flex-1 sm:flex-none sm:w-auto"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 shrink-0"
        >
          Add
        </button>
      </form>
    </div>
  );
}
