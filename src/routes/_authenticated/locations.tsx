import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, MapPin } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { myClinicsQuery } from "@/lib/queries/clinic";
import { LocationCard } from "@/components/locations/LocationCard";
import { LocationDialog } from "@/components/locations/LocationDialog";
import type { Location } from "@/components/locations/types";

const searchSchema = z.object({ clinic: z.string().optional() });

export const Route = createFileRoute("/_authenticated/locations")({
  ssr: false,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ clinic: search.clinic }),
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Locations & Rooms — Helanthus" }] }),
  component: LocationsPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">Failed: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

function LocationsPage() {
  const { clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const qc = useQueryClient();

  const locsQ = useQuery({
    queryKey: ["locations", activeClinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("clinic_id", activeClinicId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Location[];
    },
  });

  const [editingLoc, setEditingLoc] = useState<Location | null>(null);
  const [newLocOpen, setNewLocOpen] = useState(false);

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-border flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Settings</p>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Locations & Rooms</h1>
        </div>
        <button
          onClick={() => setNewLocOpen(true)}
          className="sm:ml-auto px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/10 hover:brightness-110 inline-flex items-center justify-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" /> New location
        </button>
      </div>

      <div className="p-6 space-y-4">
        {locsQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {locsQ.data && locsQ.data.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-semibold">No locations yet</p>
            <p className="text-xs text-muted-foreground">Add your clinic location to start assigning rooms.</p>
          </div>
        )}
        {locsQ.data?.map((loc) => (
          <LocationCard
            key={loc.id}
            location={loc}
            onEdit={() => setEditingLoc(loc)}
            onDeleted={() => qc.invalidateQueries({ queryKey: ["locations", activeClinicId] })}
          />
        ))}
      </div>

      {newLocOpen && (
        <LocationDialog
          clinicId={activeClinicId}
          onClose={() => setNewLocOpen(false)}
          onSaved={() => {
            setNewLocOpen(false);
            qc.invalidateQueries({ queryKey: ["locations", activeClinicId] });
          }}
        />
      )}
      {editingLoc && (
        <LocationDialog
          clinicId={activeClinicId}
          location={editingLoc}
          onClose={() => setEditingLoc(null)}
          onSaved={() => {
            setEditingLoc(null);
            qc.invalidateQueries({ queryKey: ["locations", activeClinicId] });
          }}
        />
      )}
    </AppShell>
  );
}
