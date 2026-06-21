import { addDays, format, isSameDay, isSameMonth } from "date-fns";
import { paletteColor } from "./palette";
import type { CalendarAppointment } from "@/lib/queries/clinic";

export function MonthGrid({
  anchor,
  rangeStart,
  appointments,
  onDayClick,
  onApptClick,
}: {
  anchor: Date;
  rangeStart: Date;
  appointments: CalendarAppointment[];
  onDayClick: (d: Date) => void;
  onApptClick: (a: CalendarAppointment) => void;
}) {
  const cells = Array.from({ length: 42 }, (_, i) => addDays(rangeStart, i));
  const today = new Date();

  return (
    <div className="overflow-auto">
      <div className="min-w-[640px] sm:min-w-[900px] grid grid-cols-7 border-b border-border bg-card/40">
        {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
          <div
            key={d}
            className="px-3 py-2 text-center border-l border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="min-w-[640px] sm:min-w-[900px] grid grid-cols-7 grid-rows-6">
        {cells.map((d) => {
          const inMonth = isSameMonth(d, anchor);
          const isToday = isSameDay(d, today);
          const dayAppts = appointments.filter((a) => isSameDay(new Date(a.starts_at), d));
          return (
            <div
              key={d.toISOString()}
              onClick={() => onDayClick(d)}
              className={`min-h-[110px] border-l border-t border-border p-1.5 cursor-pointer hover:bg-accent/40 transition-colors ${
                inMonth ? "" : "bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-bold ${
                    isToday
                      ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                      : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {format(d, "d")}
                </span>
                {dayAppts.length > 0 && (
                  <span className="text-[9px] font-mono text-muted-foreground">{dayAppts.length}</span>
                )}
              </div>
              <div className="space-y-0.5">
                {dayAppts.slice(0, 3).map((a) => {
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
                        backgroundColor: cancelled ? "transparent" : color,
                        borderLeft: `2px solid ${color}`,
                        color: "#1a1a1a",
                        opacity: cancelled ? 0.6 : 1,
                      }}
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold truncate ring-1 ring-black/5 hover:ring-black/30"
                    >
                      {format(new Date(a.starts_at), "HH:mm")} {a.service?.name || "Appt"}
                    </div>
                  );
                })}
                {dayAppts.length > 3 && (
                  <div className="text-[9px] text-muted-foreground font-semibold pl-1">
                    +{dayAppts.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
