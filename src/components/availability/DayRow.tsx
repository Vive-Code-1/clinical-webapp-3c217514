import { useState, type FormEvent } from "react";

export type Rule = {
  id: string;
  day_of_week: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  start_time: string;
  end_time: string;
  is_active: boolean;
};

export function DayRow({
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
