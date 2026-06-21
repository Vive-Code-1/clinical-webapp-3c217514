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
  startOfDay,
} from "date-fns";
import { AppShell } from "@/components/app/AppShell";
import { NewAppointmentDialog } from "@/components/calendar/NewAppointmentDialog";
import { AppointmentDetailDialog } from "@/components/calendar/AppointmentDetailDialog";
import { TimeGrid } from "@/components/calendar/TimeGrid";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { IcalButton } from "@/components/calendar/IcalButton";
import {
  myClinicsQuery,
  clinicAppointmentsQuery,
  type CalendarAppointment,
} from "@/lib/queries/clinic";

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

  const headerTitle =
    view === "day"
      ? format(anchor, "EEEE, MMM d, yyyy")
      : view === "month"
        ? format(anchor, "MMMM yyyy")
        : `${format(rangeStart, "MMM d")} – ${format(addDays(rangeEnd, -1), "MMM d, yyyy")}`;

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-border flex flex-wrap items-center gap-2 sm:gap-4">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">Calendar</p>
          <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight truncate">{headerTitle}</h1>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto flex-wrap">
          {clinics.length > 1 && (
            <select
              value={activeClinicId}
              onChange={(e) => setSearch({ clinic: e.target.value })}
              className="bg-background border border-input rounded-xl px-3 py-2 text-sm font-semibold min-w-0 flex-1 sm:flex-none"
            >
              {clinics.map((c: (typeof clinics)[number]) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <div className="inline-flex rounded-xl border border-input p-0.5 bg-card">
            {(["day", "week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold uppercase tracking-wider transition ${
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-1">
            <button onClick={() => goNav(-1)} aria-label="Previous" className="px-2.5 py-2 rounded-xl border border-input hover:bg-accent text-sm font-semibold">
              ←
            </button>
            <button onClick={() => goNav(0)} className="px-3 py-2 rounded-xl border border-input hover:bg-accent text-sm font-semibold">
              Today
            </button>
            <button onClick={() => goNav(1)} aria-label="Next" className="px-2.5 py-2 rounded-xl border border-input hover:bg-accent text-sm font-semibold">
              →
            </button>
          </div>
          <IcalButton userId={user.id} />
          <button
            onClick={() => {
              setDialogStart(new Date());
              setDialogOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/10 hover:brightness-110 ml-auto sm:ml-0"
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
