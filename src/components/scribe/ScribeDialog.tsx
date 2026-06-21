import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { X, Sparkles, Copy, Loader2 } from "lucide-react";
import { generateSoapNote, type ScribeResult } from "@/lib/scribe.functions";

type Props = {
  open: boolean;
  onClose: () => void;
  initialTranscript?: string;
};

export function ScribeDialog({ open, onClose, initialTranscript = "" }: Props) {
  const [transcript, setTranscript] = useState(initialTranscript);
  const [result, setResult] = useState<ScribeResult | null>(null);
  const runScribe = useServerFn(generateSoapNote);

  const mutation = useMutation({
    mutationFn: (text: string) => runScribe({ data: { transcript: text } }),
    onSuccess: (r) => setResult(r),
    onError: (e: any) => toast.error(e?.message ?? "AI Scribe failed"),
  });

  const copyAll = () => {
    if (!result) return;
    const text = `S: ${result.subjective}\n\nO: ${result.objective}\n\nA: ${result.assessment}\n\nP: ${result.plan}`;
    navigator.clipboard.writeText(text).then(() => toast.success("SOAP note copied"));
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <h2 className="font-semibold">AI Scribe — SOAP note generator</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Raw notes / transcript
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste your dictated session notes here. Example: 'Pt 34F here for f/u back pain. Reports 50% improvement since last visit. Tender L4-L5 paraspinals. Continue current plan, add core stabilization exercises…'"
              rows={18}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {transcript.length} chars · min 10 · max 20,000
              </span>
              <button
                type="button"
                onClick={() => mutation.mutate(transcript)}
                disabled={mutation.isPending || transcript.trim().length < 10}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generate SOAP
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                SOAP note
              </label>
              {result && (
                <button
                  onClick={copyAll}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Copy className="w-3 h-3" /> Copy all
                </button>
              )}
            </div>
            {!result && !mutation.isPending && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Result will appear here.
              </div>
            )}
            {mutation.isPending && (
              <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Generating…
              </div>
            )}
            {result && (
              <div className="space-y-3">
                <SoapSection letter="S" title="Subjective" body={result.subjective} />
                <SoapSection letter="O" title="Objective" body={result.objective} />
                <SoapSection letter="A" title="Assessment" body={result.assessment} />
                <SoapSection letter="P" title="Plan" body={result.plan} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SoapSection({ letter, title, body }: { letter: string; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="grid place-items-center w-6 h-6 rounded bg-primary text-primary-foreground text-xs font-bold">
          {letter}
        </span>
        <span className="text-xs font-semibold uppercase text-muted-foreground">{title}</span>
      </div>
      <p className="text-sm whitespace-pre-wrap">{body || <em className="text-muted-foreground">—</em>}</p>
    </div>
  );
}
