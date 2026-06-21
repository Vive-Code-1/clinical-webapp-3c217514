import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, MapPin, DoorOpen, Trash2, Pencil } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { myClinicsQuery } from "@/lib/queries/clinic";

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

type Location = {
  id: string;
  clinic_id: string;
  name: string;
  address_line1: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string;
  phone: string | null;
  is_active: boolean;
};

type Room = { id: string; location_id: string; name: string; capacity: number; is_active: boolean };

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

function LocationCard({
  location,
  onEdit,
  onDeleted,
}: {
  location: Location;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const roomsQ = useQuery({
    queryKey: ["rooms", location.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("location_id", location.id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Room[];
    },
  });

  const [newRoomName, setNewRoomName] = useState("");
  const [adding, setAdding] = useState(false);

  const addRoom = async () => {
    if (!newRoomName.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("rooms").insert({
      location_id: location.id,
      name: newRoomName.trim(),
      capacity: 1,
    });
    setAdding(false);
    if (error) return toast.error(error.message);
    setNewRoomName("");
    qc.invalidateQueries({ queryKey: ["rooms", location.id] });
    toast.success("Room added");
  };

  const removeRoom = async (id: string) => {
    if (!confirm("Delete this room?")) return;
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["rooms", location.id] });
  };

  const deleteLoc = async () => {
    if (!confirm(`Delete "${location.name}" and all its rooms?`)) return;
    const { error } = await supabase.from("locations").delete().eq("id", location.id);
    if (error) return toast.error(error.message);
    onDeleted();
    toast.success("Location deleted");
  };

  const addr = [location.address_line1, location.city, location.region, location.postal_code]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="rounded-2xl border border-border bg-card card-pop p-5">
      <div className="flex items-start gap-3">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
          <MapPin className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold truncate">{location.name}</h3>
          {addr && <p className="text-xs text-muted-foreground truncate">{addr}</p>}
          {location.phone && <p className="text-xs text-muted-foreground">📞 {location.phone}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={deleteLoc}
            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 sm:ml-13 border-l-2 border-dashed border-border pl-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Rooms
        </p>
        <div className="space-y-1.5">
          {roomsQ.data?.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No rooms yet.</p>
          )}
          {roomsQ.data?.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 text-sm"
            >
              <DoorOpen className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium flex-1 truncate">{r.name}</span>
              <span className="text-[10px] font-mono text-muted-foreground">cap {r.capacity}</span>
              <button
                onClick={() => removeRoom(r.id)}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRoom()}
              placeholder="New room name…"
              className="flex-1 min-w-0 bg-background border border-input rounded-lg px-3 py-1.5 text-sm"
            />
            <button
              onClick={addRoom}
              disabled={adding || !newRoomName.trim()}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50 shrink-0"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LocationDialog({
  clinicId,
  location,
  onClose,
  onSaved,
}: {
  clinicId: string;
  location?: Location;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(location?.name ?? "");
  const [addr, setAddr] = useState(location?.address_line1 ?? "");
  const [city, setCity] = useState(location?.city ?? "");
  const [region, setRegion] = useState(location?.region ?? "");
  const [postal, setPostal] = useState(location?.postal_code ?? "");
  const [phone, setPhone] = useState(location?.phone ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast.error("Name required");
    setSaving(true);
    const payload = {
      name: name.trim(),
      address_line1: addr || null,
      city: city || null,
      region: region || null,
      postal_code: postal || null,
      phone: phone || null,
    };
    const { error } = location
      ? await supabase.from("locations").update(payload).eq("id", location.id)
      : await supabase.from("locations").insert({ ...payload, clinic_id: clinicId });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(location ? "Updated" : "Created");
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl card-pop p-6 w-full max-w-md space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">{location ? "Edit location" : "New location"}</h2>
        <Field label="Name *" value={name} onChange={setName} />
        <Field label="Address" value={addr} onChange={setAddr} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" value={city} onChange={setCity} />
          <Field label="Region" value={region} onChange={setRegion} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Postal code" value={postal} onChange={setPostal} />
          <Field label="Phone" value={phone} onChange={setPhone} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-input text-sm font-semibold hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-background border border-input rounded-lg px-3 py-2 text-sm"
      />
    </label>
  );
}
