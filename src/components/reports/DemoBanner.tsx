import { Wand2 } from "lucide-react";

export function DemoBanner({
  demoActive,
  liveEmpty,
  demoOverride,
  onToggle,
  texts,
}: {
  demoActive: boolean;
  liveEmpty: boolean;
  demoOverride: boolean | null;
  onToggle: () => void;
  texts: { sampleBanner: string; sampleBody: string; viewLive: string; showDemo: string; previewSample: string };
}) {
  if (demoActive) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3 flex-wrap">
        <Wand2 className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0 text-sm">
          <span className="font-semibold text-foreground">{texts.sampleBanner}</span>{" "}
          <span className="text-muted-foreground">{texts.sampleBody}</span>
        </div>
        <button
          onClick={onToggle}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
        >
          {liveEmpty && demoOverride !== false ? texts.viewLive : texts.showDemo}
        </button>
      </div>
    );
  }
  if (!liveEmpty) {
    return (
      <div className="flex justify-end">
        <button
          onClick={onToggle}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors inline-flex items-center gap-1.5"
        >
          <Wand2 className="w-3.5 h-3.5" /> {texts.previewSample}
        </button>
      </div>
    );
  }
  return null;
}
