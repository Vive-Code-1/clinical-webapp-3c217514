import type { ServiceLite } from "./types";

export type LineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  tax_pct: number;
  service_type_id: string;
};

export function InvoiceLineItemRow({
  item,
  index,
  services,
  onServiceChange,
  onPatch,
  onRemove,
}: {
  item: LineItem;
  index: number;
  services: ServiceLite[];
  onServiceChange: (i: number, sid: string) => void;
  onPatch: (i: number, patch: Partial<LineItem>) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      <select
        value={item.service_type_id}
        onChange={(e) => onServiceChange(index, e.target.value)}
        className="col-span-3 px-2 py-2 rounded-lg border border-input bg-background text-xs"
      >
        <option value="">Custom</option>
        {services.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <input
        placeholder="Description"
        value={item.description}
        onChange={(e) => onPatch(index, { description: e.target.value })}
        className="col-span-4 px-2 py-2 rounded-lg border border-input bg-background text-sm"
      />
      <input
        type="number"
        step="0.5"
        min="0"
        value={item.quantity}
        onChange={(e) => onPatch(index, { quantity: parseFloat(e.target.value) || 0 })}
        className="col-span-1 px-2 py-2 rounded-lg border border-input bg-background text-sm text-right"
      />
      <input
        type="number"
        step="0.01"
        min="0"
        placeholder="Price"
        value={item.unit_price}
        onChange={(e) => onPatch(index, { unit_price: parseFloat(e.target.value) || 0 })}
        className="col-span-2 px-2 py-2 rounded-lg border border-input bg-background text-sm text-right"
      />
      <input
        type="number"
        step="0.1"
        min="0"
        placeholder="Tax %"
        value={item.tax_pct}
        onChange={(e) => onPatch(index, { tax_pct: parseFloat(e.target.value) || 0 })}
        className="col-span-1 px-2 py-2 rounded-lg border border-input bg-background text-sm text-right"
      />
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="col-span-1 text-xs text-destructive"
      >
        ✕
      </button>
    </div>
  );
}
