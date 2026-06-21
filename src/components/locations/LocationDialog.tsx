import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field } from "./Field";
import type { Location } from "./types";

export function LocationDialog({
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
