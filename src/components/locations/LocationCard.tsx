import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DoorOpen, MapPin, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Location, Room } from "./types";

export function LocationCard({
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
