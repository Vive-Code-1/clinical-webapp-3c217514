type ClientLite = { id: string; user_id: string | null; full_name: string; email: string | null; phone: string | null };

type Props = {
  mode: "existing" | "guest";
  onModeChange: (m: "existing" | "guest") => void;
  clients: ClientLite[];
  isLoading: boolean;
  filtered: ClientLite[];
  search: string;
  onSearch: (q: string) => void;
  selectedClientId: string;
  onSelectClient: (id: string) => void;
  guestName: string;
  onGuestName: (v: string) => void;
  saveAsClient: boolean;
  onSaveAsClient: (v: boolean) => void;
};

export function ClientPicker({
  mode,
  onModeChange,
  isLoading,
  filtered,
  search,
  onSearch,
  selectedClientId,
  onSelectClient,
  guestName,
  onGuestName,
  saveAsClient,
  onSaveAsClient,
}: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Client</span>
        <div className="flex gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onModeChange("existing")}
            className={`px-2.5 py-1 rounded-full ${
              mode === "existing" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            Existing
          </button>
          <button
            type="button"
            onClick={() => onModeChange("guest")}
            className={`px-2.5 py-1 rounded-full ${
              mode === "guest" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            New / guest
          </button>
        </div>
      </div>

      {mode === "existing" ? (
        <div className="space-y-2">
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by name, email, phone…"
            className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-sm"
          />
          <div className="max-h-44 overflow-y-auto rounded-xl border border-input divide-y divide-border">
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                {isLoading ? "Loading…" : "No matching clients."}
              </p>
            )}
            {filtered.slice(0, 50).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectClient(c.id)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                  selectedClientId === c.id ? "bg-primary/10" : ""
                }`}
              >
                <p className="font-semibold">{c.full_name}</p>
                {(c.email || c.phone) && (
                  <p className="text-xs text-muted-foreground">{c.email || c.phone}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            value={guestName}
            onChange={(e) => onGuestName(e.target.value)}
            placeholder="Full name"
            className="w-full bg-background border border-input rounded-xl px-3 py-2.5"
            required={mode === "guest"}
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={saveAsClient}
              onChange={(e) => onSaveAsClient(e.target.checked)}
            />
            Also save as a client record
          </label>
        </div>
      )}
    </div>
  );
}
