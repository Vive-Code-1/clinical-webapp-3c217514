import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  format,
  addDays,
  isSameDay,
  isSameMonth,
  differenceInMinutes,
  startOfDay,
} from "date-fns";
import { AppShell } from "@/components/app/AppShell";
import { NewAppointmentDialog } from "@/components/calendar/NewAppointmentDialog";
import { AppointmentDetailDialog } from "@/components/calendar/AppointmentDetailDialog";
import {
  myClinicsQuery,
  clinicAppointmentsQuery,
  type CalendarAppointment,
} from "@/lib/clinic-queries";

const searchSchema = z.object({
  clinic: z.string().optional(),
  date: z.string().optional(), // ISO date anchor
  view: z.enum(["day", "week", "month"]).optional(),
});

type ViewMode = "day" | "week" | "month";

export const Route = createFileRoute("/_authenticated/calendar")({
  ssr: false,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ clinic: search.clinic, date: search.date, view: search.view }),
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) {
      throw redirect({ to: "/onboarding" });
    }
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Calendar — SANTÉ" }] }),
  component: CalendarPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">Calendar failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7am → 6pm
const HOUR_PX = 56;

const APPT_PALETTE = ["#CBEAFB", "#FFD7E3", "#C9EFD9", "#FEDEC4"] as const;
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function paletteColor(id: string) {
  return APPT_PALETTE[hashId(id) % APPT_PALETTE.length]!;
}

function CalendarPage() {
  const { user, clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/calendar" });

  const view: ViewMode = search.view ?? "week";
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const anchor = search.date ? new Date(search.date) : new Date();

  // compute range based on view
  let rangeStart: Date;
  let rangeEnd: Date;
  if (view === "day") {
    rangeStart = startOfDay(anchor);
    rangeEnd = addDays(rangeStart, 1);
  } else if (view === "month") {
    const mStart = startOfMonth(anchor);
    rangeStart = startOfWeek(mStart, { weekStartsOn: 1 });
    rangeEnd = addDays(endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }), 1);
  } else {
    rangeStart = startOfWeek(anchor, { weekStartsOn: 1 });
    rangeEnd = addDays(endOfWeek(rangeStart, { weekStartsOn: 1 }), 1);
  }

  const appts = useSuspenseQuery(
    clinicAppointmentsQuery(activeClinicId, rangeStart.toISOString(), rangeEnd.toISOString()),
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStart, setDialogStart] = useState<Date | undefined>();
  const [selected, setSelected] = useState<CalendarAppointment | null>(null);

  const setSearch = (patch: Partial<z.infer<typeof searchSchema>>) =>
    navigate({ search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, ...patch }) });

  const setView = (v: ViewMode) => setSearch({ view: v });
  const setDate = (d: Date) => setSearch({ date: format(d, "yyyy-MM-dd") });

  const goNav = (dir: -1 | 0 | 1) => {
    if (dir === 0) return setDate(new Date());
    if (view === "day") setDate(addDays(anchor, dir));
    else if (view === "month") setDate(dir > 0 ? addMonths(anchor, 1) : subMonths(anchor, 1));
    else setDate(dir > 0 ? addWeeks(anchor, 1) : subWeeks(anchor, 1));
  };

  const openNewAt = (day: Date, hour: number) => {
    const d = new Date(day);
    d.setHours(hour, 0, 0, 0);
    setDialogStart(d);
    setDialogOpen(true);
  };

  // Header title
  const headerTitle =
    view === "day"
      ? format(anchor, "EEEE, MMM d, yyyy")
      : view === "month"
        ? format(anchor, "MMMM yyyy")
        : `${format(rangeStart, "MMM d")} – ${format(addDays(rangeEnd, -1), "MMM d, yyyy")}`;

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="px-6 py-6 border-b border-border flex flex-wrap items-center gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Calendar</p>
          <h1 className="text-2xl font-extrabold tracking-tight truncate">{headerTitle}</h1>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {clinics.length > 1 && (
            <select
              value={activeClinicId}
              onChange={(e) => setSearch({ clinic: e.target.value })}
              className="bg-background border border-input rounded-xl px-3 py-2 text-sm font-semibold"
            >
              {clinics.map((c: (typeof clinics)[number]) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* View switcher */}
          <div className="inline-flex rounded-xl border border-input p-0.5 bg-card">
            {(["day", "week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <button onClick={() => goNav(-1)} className="px-3 py-2 rounded-xl border border-input hover:bg-accent text-sm font-semibold">
            ←
          </button>
          <button onClick={() => goNav(0)} className="px-3 py-2 rounded-xl border border-input hover:bg-accent text-sm font-semibold">
            Today
          </button>
          <button onClick={() => goNav(1)} className="px-3 py-2 rounded-xl border border-input hover:bg-accent text-sm font-semibold">
            →
          </button>
          <button
            onClick={() => {
              setDialogStart(new Date());
              setDialogOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/10 hover:brightness-110"
          >
            + New
          </button>
        </div>
      </div>

      {view === "month" ? (
        <MonthGrid
          anchor={anchor}
          rangeStart={rangeStart}
          appointments={appts.data ?? []}
          onDayClick={(d) => {
            setDate(d);
            setView("day");
          }}
          onApptClick={(a) => setSelected(a)}
        />
      ) : (
        <TimeGrid
          days={view === "day" ? [anchor] : Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i))}
          appointments={appts.data ?? []}
          onSlotClick={openNewAt}
          onApptClick={(a) => setSelected(a)}
        />
      )}

      <NewAppointmentDialog
        clinicId={activeClinicId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialStart={dialogStart}
        defaultPractitionerId={user.id}
      />
      <AppointmentDetailDialog
        clinicId={activeClinicId}
        appointment={selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </AppShell>
  );
}

function TimeGrid({
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
  const gridTemplate = `60px repeat(${cols}, minmax(0, 1fr))`;
  const minW = cols === 1 ? "min-w-[400px]" : "min-w-[900px]";

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

function MonthGrid({
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
  // 6 weeks × 7 days = 42 cells
  const cells = Array.from({ length: 42 }, (_, i) => addDays(rangeStart, i));
  const today = new Date();

  return (
    <div className="overflow-auto">
      <div className="min-w-[900px] grid grid-cols-7 border-b border-border bg-card/40">
        {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
          <div
            key={d}
            className="px-3 py-2 text-center border-l border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="min-w-[900px] grid grid-cols-7 grid-rows-6">
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
