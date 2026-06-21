import type { LucideIcon } from "lucide-react";

export type BentoTone = "stat-blue" | "stat-pink" | "stat-green" | "stat-peach" | "primary";

export function BentoCard({
  icon: Icon,
  title,
  body,
  span,
  tone,
  dark,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  span?: string;
  tone: BentoTone;
  dark?: boolean;
}) {
  const bg: Record<BentoTone, string> = {
    "stat-blue": "bg-stat-blue",
    "stat-pink": "bg-stat-pink",
    "stat-green": "bg-stat-green",
    "stat-peach": "bg-stat-peach",
    primary: "bg-primary",
  };
  return (
    <div
      className={`group rounded-3xl p-7 border border-border/40 hover:-translate-y-1 hover:shadow-xl transition-all ${bg[tone]} ${
        dark ? "text-primary-foreground" : "text-foreground"
      } ${span ?? ""}`}
    >
      <span
        className={`grid place-items-center size-11 rounded-2xl mb-6 ${
          dark ? "bg-primary-foreground/15 text-primary-foreground" : "bg-card/80 text-primary"
        }`}
      >
        <Icon className="w-5 h-5" />
      </span>
      <h3 className="text-lg md:text-xl font-bold mb-2">{title}</h3>
      <p
        className={`text-sm font-serif leading-relaxed ${
          dark ? "text-primary-foreground/80" : "text-foreground/70"
        }`}
      >
        {body}
      </p>
    </div>
  );
}
