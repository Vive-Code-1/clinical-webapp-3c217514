import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  MessageSquare,
  Receipt,
  Play,
} from "lucide-react";
import { useAppTranslation } from "@/lib/app-translations";
import { trackHomeEvent } from "@/lib/home-analytics";

type StepKey = "dashboard" | "appointments" | "reports" | "messages" | "billing";

const STEPS: { key: StepKey; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", icon: LayoutDashboard },
  { key: "appointments", icon: CalendarDays },
  { key: "reports", icon: BarChart3 },
  { key: "messages", icon: MessageSquare },
  { key: "billing", icon: Receipt },
];

export function InteractiveWalkthrough() {
  const { t, language } = useAppTranslation();
  const [active, setActive] = useState<StepKey>("dashboard");
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setActive((cur) => {
        const idx = STEPS.findIndex((s) => s.key === cur);
        return STEPS[(idx + 1) % STEPS.length].key;
      });
    }, 4500);
    return () => window.clearInterval(id);
  }, [playing]);

  const handleSelect = (key: StepKey) => {
    setActive(key);
    setPlaying(false);
    void trackHomeEvent("walkthrough_tab", language, { step: key });
  };

  return (
    <div className="relative bg-card rounded-[2rem] p-3 shadow-2xl ring-1 ring-foreground/10 overflow-hidden">
      {/* Window chrome + tabs */}
      <div className="rounded-[1.5rem] overflow-hidden bg-secondary">
        <div className="h-10 flex items-center px-4 gap-1.5 border-b border-foreground/5 bg-card">
          <span className="size-2.5 rounded-full bg-destructive/60" />
          <span className="size-2.5 rounded-full bg-chart-4/60" />
          <span className="size-2.5 rounded-full bg-primary/60" />
          <button
            onClick={() => setPlaying((p) => !p)}
            className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            aria-pressed={playing}
          >
            <Play className="w-3 h-3" />
            {playing ? t("landing.walkthrough.pause") : t("landing.walkthrough.play")}
          </button>
        </div>

        {/* Tab strip */}
        <div className="flex flex-wrap gap-1 px-3 pt-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = s.key === active;
            return (
              <button
                key={s.key}
                onClick={() => handleSelect(s.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-transparent text-muted-foreground hover:bg-foreground/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t(`landing.walkthrough.steps.${s.key}.tab`)}
              </button>
            );
          })}
        </div>

        {/* Stage */}
        <div className="p-5 md:p-8 min-h-[360px] md:min-h-[420px]">
          {STEPS.map((s) =>
            s.key !== active ? null : (
              <div key={s.key} className="animate-fade-in">
                <div className="grid md:grid-cols-[1.2fr_1fr] gap-6 items-center">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary mb-3">
                      <s.icon className="w-3.5 h-3.5" />
                      {t(`landing.walkthrough.steps.${s.key}.tab`)}
                    </span>
                    <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mb-3">
                      {t(`landing.walkthrough.steps.${s.key}.title`)}
                    </h3>
                    <p className="text-sm md:text-base font-serif text-muted-foreground leading-relaxed mb-5">
                      {t(`landing.walkthrough.steps.${s.key}.body`)}
                    </p>
                    <ul className="space-y-2">
                      {(t(`landing.walkthrough.steps.${s.key}.bullets`, {
                        returnObjects: true,
                      }) as unknown as string[]).map((b: string) => (
                        <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <MockPanel step={s.key} />
                </div>
                {/* Progress bar */}
                <div className="mt-6 flex items-center gap-1">
                  {STEPS.map((p) => (
                    <span
                      key={p.key}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        p.key === active ? "bg-primary" : "bg-foreground/10"
                      }`}
                    />
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function MockPanel({ step }: { step: StepKey }) {
  if (step === "dashboard") {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[
          { tone: "bg-stat-blue", label: "Patients", value: "1,644+" },
          { tone: "bg-stat-pink", label: "Returning", value: "301+" },
          { tone: "bg-stat-green", label: "New", value: "100+" },
          { tone: "bg-stat-peach", label: "Appts", value: "42" },
        ].map((c) => (
          <div key={c.label} className={`${c.tone} rounded-2xl p-4`}>
            <div className="text-[11px] font-semibold text-foreground/60">{c.label}</div>
            <div className="text-2xl font-extrabold text-foreground mt-1">{c.value}</div>
          </div>
        ))}
      </div>
    );
  }
  if (step === "appointments") {
    return (
      <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
        {["09:00 · David B.", "10:30 · Léa M.", "13:00 · Karim P.", "15:30 · Anna S."].map((r) => (
          <div
            key={r}
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/60 text-sm"
          >
            <span className="font-medium text-foreground">{r}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Confirmed
            </span>
          </div>
        ))}
      </div>
    );
  }
  if (step === "reports") {
    return (
      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="flex items-end gap-2 h-40">
          {[40, 65, 55, 80, 70, 95, 75].map((h, i) => (
            <div key={i} className="flex-1 rounded-md bg-primary" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Mon</span><span>Wed</span><span>Fri</span><span>Sun</span>
        </div>
      </div>
    );
  }
  if (step === "messages") {
    return (
      <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-secondary px-3 py-2 text-sm">
          Hi doctor, can I move my appointment?
        </div>
        <div className="max-w-[80%] ml-auto rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-3 py-2 text-sm">
          Of course — Tuesday 10:30 works.
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-secondary px-3 py-2 text-sm">
          Perfect, thank you 🙏
        </div>
      </div>
    );
  }
  // billing
  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-muted-foreground">Invoice #INV-2041</div>
          <div className="text-xl font-extrabold text-foreground">$240.00</div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-primary/10 text-primary">
          Paid
        </span>
      </div>
      <div className="space-y-2 text-sm">
        {["Initial consultation", "Lab work", "Follow-up plan"].map((r) => (
          <div key={r} className="flex items-center justify-between py-1.5 border-b border-border last:border-none">
            <span className="text-foreground">{r}</span>
            <span className="text-muted-foreground">$80.00</span>
          </div>
        ))}
      </div>
    </div>
  );
}
