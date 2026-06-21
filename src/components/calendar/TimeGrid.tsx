import { format, isSameDay, differenceInMinutes, startOfDay } from "date-fns";
import { HOURS, HOUR_PX, paletteColor } from "./palette";
import type { CalendarAppointment } from "@/lib/queries/clinic";

export function TimeGrid({
  days,
  appointments,
  onSlotClick,
  onApptClick,
}: {
  days: Date[];
  appointments: CalendarAppointment[];
  onSlotClick: (day: Date, hour: number) => void;
  onApptClick: (a: CalendarAppointment) => void;
}) {
  const cols = days.length;
  const gridTemplate = `48px repeat(${cols}, minmax(0, 1fr))`;
  const minW = cols === 1 ? "min-w-[320px]" : "min-w-[640px] sm:min-w-[900px]";

  return (
    <div className="overflow-auto">
      <div
        className={`${minW} grid border-b border-border bg-card/40`}
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div />
        {days.map((d) => (
          <div key={d.toISOString()} className="px-3 py-3 text-center border-l border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {format(d, "EEE")}
            </p>
            <p className={`text-lg font-extrabold ${isSameDay(d, new Date()) ? "text-primary" : ""}`}>
              {format(d, "d")}
            </p>
          </div>
        ))}
      </div>

      <div
        className={`${minW} grid relative`}
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div>
          {HOURS.map((h) => (
            <div
              key={h}
              style={{ height: HOUR_PX }}
              className="text-[10px] font-mono text-muted-foreground text-right pr-2 pt-1 border-t border-border"
            >
              {h.toString().padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayAppts = appointments.filter((a) => isSameDay(new Date(a.starts_at), day));
          return (
            <div key={day.toISOString()} className="relative border-l border-border">
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{ height: HOUR_PX }}
                  onClick={() => onSlotClick(day, h)}
                  className="border-t border-border hover:bg-accent/40 cursor-pointer transition-colors"
                />
              ))}
              {dayAppts.map((a) => {
                const s = new Date(a.starts_at);
                const e = new Date(a.ends_at);
                const dayStart = startOfDay(day);
                dayStart.setHours(HOURS[0]!, 0, 0, 0);
                const topMin = differenceInMinutes(s, dayStart);
                if (topMin < 0 || topMin > HOURS.length * 60) return null;
                const color = paletteColor(a.id);
                const cancelled = a.status === "cancelled" || a.status === "no_show";
                return (
                  <div
                    key={a.id}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onApptClick(a);
                    }}
                    style={{
                      top: (topMin / 60) * HOUR_PX + 2,
                      height: HOUR_PX - 4,
                      backgroundColor: cancelled ? "transparent" : color,
                      borderLeft: `3px solid ${color}`,
                      opacity: cancelled ? 0.65 : 1,
                      color: "#1a1a1a",
                    }}
                    className="absolute left-1 right-1 rounded-md px-2 py-1.5 overflow-hidden ring-1 ring-black/5 hover:ring-black/40 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-center gap-0.5"
                  >
                    <p className="text-[11px] font-semibold leading-tight truncate">
                      {a.service?.name || "Appointment"}
                    </p>
                    <p className="text-[10px] leading-tight opacity-75 truncate">
                      {a.client_name || a.guest_name || "Walk-in"}
                    </p>
                    <p className="text-[9px] font-mono opacity-60 leading-tight">
                      {format(s, "HH:mm")}–{format(e, "HH:mm")}
                    </p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
