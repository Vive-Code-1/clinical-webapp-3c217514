import { addDays, format, startOfDay } from "date-fns";

export function DatePicker({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (d: string) => void;
}) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {days.map((d) => {
        const iso = format(d, "yyyy-MM-dd");
        const active = iso === selected;
        return (
          <button
            key={iso}
            onClick={() => onChange(iso)}
            className={`flex-shrink-0 w-16 py-3 rounded-2xl ring-1 transition-all text-center ${
              active ? "ring-primary bg-primary/5" : "ring-border bg-card hover:ring-foreground/30"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {format(d, "EEE")}
            </p>
            <p className="text-lg font-extrabold">{format(d, "d")}</p>
            <p className="text-[10px] text-muted-foreground">{format(d, "MMM")}</p>
          </button>
        );
      })}
    </div>
  );
}
