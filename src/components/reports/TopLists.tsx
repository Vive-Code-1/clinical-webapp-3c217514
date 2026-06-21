import { Sparkles, Users } from "lucide-react";

type Service = { name: string; count: number; revenueCents: number };
type Client = { id: string; name: string; appointments: number; spentCents: number };

export function TopServices({
  items,
  emptyLabel,
  title,
  money,
}: {
  items: Service[];
  emptyLabel: string;
  title: string;
  money: (cents: number) => string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card card-pop p-5 card-interactive">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((s) => (
            <li key={s.name} className="py-2 flex items-center justify-between gap-3">
              <span className="text-sm truncate">{s.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {s.count} · {money(s.revenueCents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TopClients({
  items,
  emptyLabel,
  title,
  apptsLabel,
  money,
}: {
  items: Client[];
  emptyLabel: string;
  title: string;
  apptsLabel: string;
  money: (cents: number) => string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card card-pop p-5 card-interactive">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((c) => (
            <li key={c.id} className="py-2 flex items-center justify-between gap-3">
              <span className="text-sm truncate">{c.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {c.appointments} {apptsLabel} · {money(c.spentCents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
