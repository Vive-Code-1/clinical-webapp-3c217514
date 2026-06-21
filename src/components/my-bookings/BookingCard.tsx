import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { CalendarDays, Clock, MapPin, X, Video } from "lucide-react";
import type { Booking } from "./types";

export function BookingCard({
  b,
  onCancel,
  cancelling,
}: {
  b: Booking;
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  const s = new Date(b.starts_at);
  const e = new Date(b.ends_at);
  const brand = b.clinic?.brand_color || b.service?.color || "#7A5C3A";
  const cancelled = b.status === "cancelled" || b.status === "no_show";

  return (
    <article
      className="rounded-2xl bg-card ring-1 ring-border p-5 flex gap-5"
      style={{ borderLeft: `4px solid ${brand}` }}
    >
      <div className="flex flex-col items-center justify-center w-20 shrink-0 border-r border-border pr-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{format(s, "MMM")}</p>
        <p className="text-3xl font-extrabold leading-none">{format(s, "d")}</p>
        <p className="text-[10px] text-muted-foreground mt-1">{format(s, "yyyy")}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-extrabold">{b.service?.name || "Appointment"}</p>
            {b.clinic && (
              <Link
                to="/book/$slug"
                params={{ slug: b.clinic.slug }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {b.clinic.name}
              </Link>
            )}
          </div>
          {cancelled && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-destructive bg-destructive/10 px-2 py-1 rounded-full">
              {b.status}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {format(s, "EEE · HH:mm")} – {format(e, "HH:mm")}
          </span>
          {b.practitioner_name && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {b.practitioner_name}
            </span>
          )}
        </div>
        {b.notes && <p className="text-xs font-serif text-muted-foreground mt-2">{b.notes}</p>}
        {b.meeting_url && !cancelled && (
          <div className="mt-3">
            <Link
              to="/telehealth/$appointmentId"
              params={{ appointmentId: b.id }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Video className="w-3.5 h-3.5" /> Join video call
            </Link>
          </div>
        )}
        {onCancel && !cancelled && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={onCancel}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-60"
            >
              <X className="w-3.5 h-3.5" />
              {cancelling ? "Cancelling…" : "Cancel"}
            </button>
            {b.clinic && (
              <Link
                to="/book/$slug"
                params={{ slug: b.clinic.slug }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-input hover:bg-accent"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Book another
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
