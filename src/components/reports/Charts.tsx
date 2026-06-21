export function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  tone: "emerald" | "amber" | "sky" | "rose";
}) {
  const toneClass = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    sky: "bg-sky-100 text-sky-700",
    rose: "bg-rose-100 text-rose-700",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card card-pop p-5 card-interactive">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
          {label}
        </span>
        <span className={`grid place-items-center w-8 h-8 rounded-lg ${toneClass}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export function BarChart({
  data,
  format,
  color,
}: {
  data: { label: string; value: number }[];
  format: (v: number) => string;
  color: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-1 w-full min-w-0">
      <div className="flex items-end gap-px h-40 w-full min-w-0 overflow-hidden">
        {data.map((d) => (
          <div
            key={d.label}
            className="flex-1 min-w-0 rounded-t group relative"
            style={{
              height: `${(d.value / max) * 100}%`,
              background: color,
              opacity: d.value === 0 ? 0.15 : 1,
            }}
            title={`${d.label}: ${format(d.value)}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
