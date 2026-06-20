import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  addDays,
  isSameDay,
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
  week: z.string().optional(), // ISO date of week start
});

export const Route = createFileRoute("/_authenticated/calendar")({
  ssr: false,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ clinic: search.clinic, week: search.week }),
  beforeLoad: async ({ context }) => {
    // Ensure clinic exists; redirect to onboarding if none
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

  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const weekStart = search.week ? startOfWeek(new Date(search.week), { weekStartsOn: 1 }) : startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const appts = useSuspenseQuery(
    clinicAppointmentsQuery(activeClinicId, weekStart.toISOString(), addDays(weekEnd, 1).toISOString()),
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStart, setDialogStart] = useState<Date | undefined>();
  const [selected, setSelected] = useState<CalendarAppointment | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goWeek = (dir: -1 | 0 | 1) => {
    const target = dir === 0 ? new Date() : dir > 0 ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1);
    navigate({
      search: (prev: z.infer<typeof searchSchema>) => ({
        ...prev,
        week: format(startOfWeek(target, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      }),
    });
  };

  const openNewAt = (day: Date, hour: number) => {
    const d = new Date(day);
    d.setHours(hour, 0, 0, 0);
    setDialogStart(d);
    setDialogOpen(true);
  };

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="px-6 py-6 border-b border-border flex flex-wrap items-center gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Calendar</p>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
          </h1>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {clinics.length > 1 && (
            <select
              value={activeClinicId}
              onChange={(e) =>
                navigate({
                  search: (p: z.infer<typeof searchSchema>) => ({ ...p, clinic: e.target.value }),
                })
              }
              className="bg-background border border-input rounded-xl px-3 py-2 text-sm font-semibold"
            >
              {clinics.map((c: (typeof clinics)[number]) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button onClick={() => goWeek(-1)} className="px-3 py-2 rounded-xl border border-input hover:bg-accent text-sm font-semibold">
            ←
          </button>
          <button onClick={() => goWeek(0)} className="px-3 py-2 rounded-xl border border-input hover:bg-accent text-sm font-semibold">
            Today
          </button>
          <button onClick={() => goWeek(1)} className="px-3 py-2 rounded-xl border border-input hover:bg-accent text-sm font-semibold">
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

      <div className="overflow-auto">
        <div className="min-w-[900px] grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-card/40">
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

        <div className="min-w-[900px] grid grid-cols-[60px_repeat(7,1fr)] relative">
          <div>
            {HOURS.map((h) => (
              <div key={h} style={{ height: HOUR_PX }} className="text-[10px] font-mono text-muted-foreground text-right pr-2 pt-1 border-t border-border">
                {h.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayAppts = (appts.data ?? []).filter((a) => isSameDay(new Date(a.starts_at), day));
            return (
              <div key={day.toISOString()} className="relative border-l border-border">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{ height: HOUR_PX }}
                    onClick={() => openNewAt(day, h)}
                    className="border-t border-border hover:bg-accent/40 cursor-pointer transition-colors"
                  />
                ))}
                {dayAppts.map((a) => {
                  const s = new Date(a.starts_at);
                  const e = new Date(a.ends_at);
                  const dayStart = startOfDay(day);
                  dayStart.setHours(HOURS[0]!, 0, 0, 0);
                  const topMin = differenceInMinutes(s, dayStart);
                  const heightMin = Math.max(20, differenceInMinutes(e, s));
                  if (topMin < 0 || topMin > (HOURS.length) * 60) return null;
                  const color = paletteColor(a.id);
                  const cancelled = a.status === "cancelled" || a.status === "no_show";
                  const height = (heightMin / 60) * HOUR_PX;
                  const compact = height < 44;
                  return (
                    <div
                      key={a.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setSelected(a);
                      }}
                      style={{
                        top: (topMin / 60) * HOUR_PX + 2,
                        height: height - 4,
                        backgroundColor: cancelled ? "transparent" : color,
                        borderLeft: `3px solid ${color}`,
                        opacity: cancelled ? 0.65 : 1,
                        color: "#1a1a1a",
                      }}
                      className="absolute left-1 right-1 rounded-md px-2 py-1 overflow-hidden ring-1 ring-black/5 hover:ring-black/40 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-center gap-0.5"
                    >
                      {compact ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-mono opacity-70 shrink-0">
                            {format(s, "HH:mm")}
                          </span>
                          <span className="text-[11px] font-semibold leading-tight truncate">
                            {a.service?.name || "Appointment"}
                          </span>
                        </div>
                      ) : (
                        <>
                          <p className="text-[11px] font-semibold leading-tight truncate">
                            {a.service?.name || "Appointment"}
                          </p>
                          <p className="text-[10px] leading-tight opacity-75 truncate">
                            {a.client_name || a.guest_name || "Walk-in"}
                          </p>
                          {height >= 64 && (
                            <p className="text-[9px] font-mono opacity-60 leading-tight">
                              {format(s, "HH:mm")}–{format(e, "HH:mm")}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

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
