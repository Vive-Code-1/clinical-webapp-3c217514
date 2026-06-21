type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  color: string;
};

export function ServiceList({
  services,
  selectedId,
  onSelect,
}: {
  services: Service[] | undefined;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {services?.map((s) => {
        const active = s.id === selectedId;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`text-left p-4 rounded-2xl ring-1 transition-all ${
              active ? "ring-primary bg-primary/5" : "ring-border bg-card hover:ring-foreground/30"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-1 h-12 rounded-full mt-1" style={{ backgroundColor: s.color }} />
              <div className="flex-1 min-w-0">
                <p className="font-bold">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.duration_minutes} min · {(s.price_cents / 100).toFixed(2)} {s.currency}
                </p>
              </div>
            </div>
          </button>
        );
      })}
      {services?.length === 0 && (
        <p className="font-serif text-muted-foreground text-sm col-span-full">
          No services available for online booking yet.
        </p>
      )}
    </div>
  );
}

type Practitioner = { user_id: string; title: string | null; role: string };

export function PractitionerList({
  practitioners,
  isLoading,
  selectedId,
  onSelect,
}: {
  practitioners: Practitioner[] | undefined;
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <div className="grid sm:grid-cols-3 gap-3">
        {(practitioners ?? []).map((p) => {
          const active = p.user_id === selectedId;
          return (
            <button
              key={p.user_id}
              onClick={() => onSelect(p.user_id)}
              className={`p-4 rounded-2xl ring-1 transition-all text-left ${
                active ? "ring-primary bg-primary/5" : "ring-border bg-card hover:ring-foreground/30"
              }`}
            >
              <p className="font-bold">{p.title || (p.role === "owner" ? "Founder" : "Practitioner")}</p>
              <p className="text-xs text-muted-foreground capitalize">{p.role}</p>
            </button>
          );
        })}
        {practitioners?.length === 0 && (
          <p className="font-serif text-muted-foreground text-sm col-span-full">
            No practitioner is offering this service yet.
          </p>
        )}
      </div>
    </>
  );
}
