import { Link } from "@tanstack/react-router";
import { format } from "date-fns";

export function SlotGrid({
  slots,
  isLoading,
  pending,
  showSignInHint,
  onPick,
}: {
  slots: Date[] | undefined;
  isLoading: boolean;
  pending: boolean;
  showSignInHint: boolean;
  onPick: (slot: Date) => void;
}) {
  return (
    <>
      {isLoading && <p className="text-sm text-muted-foreground">Loading slots…</p>}
      {slots?.length === 0 && (
        <p className="font-serif text-muted-foreground text-sm">
          No openings on this date. Try another day.
        </p>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {slots?.map((slot) => (
          <button
            key={slot.toISOString()}
            onClick={() => onPick(slot)}
            disabled={pending}
            className="px-3 py-2.5 rounded-xl bg-card ring-1 ring-border hover:ring-primary text-sm font-mono font-bold transition-all disabled:opacity-60"
          >
            {format(slot, "HH:mm")}
          </button>
        ))}
      </div>
      {showSignInHint && (
        <p className="mt-4 text-sm font-serif text-muted-foreground">
          You'll be asked to{" "}
          <Link to="/auth/sign-in" className="font-bold text-primary underline">
            sign in
          </Link>{" "}
          before confirming.
        </p>
      )}
    </>
  );
}
