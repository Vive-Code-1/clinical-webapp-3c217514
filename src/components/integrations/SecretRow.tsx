import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  Save,
  Trash2,
} from "lucide-react";
import type { IntegrationStatus } from "@/lib/functions/integrations";

export function SecretRow({
  item,
  onSave,
  saving,
}: {
  item: IntegrationStatus;
  onSave: (value: string) => void;
  saving: boolean;
}) {
  const isLovable = item.key === "LOVABLE_API_KEY";
  const isEnvLocked = item.source === "env";

  const [value, setValue] = useState("");
  const [show, setShow] = useState(!item.secret);

  useEffect(() => {
    setValue("");
  }, [item.source, item.hasValue, item.preview]);

  const disabled = isLovable || isEnvLocked;

  return (
    <li className="px-5 py-4 space-y-3">
      <div className="flex items-start gap-3 flex-wrap">
        <code className="font-mono text-xs px-2 py-1 rounded bg-muted border border-border">
          {item.key}
        </code>
        <span className="text-sm font-medium">{item.label}</span>
        {!item.required && (
          <span className="text-[10px] uppercase text-muted-foreground font-bold">optional</span>
        )}
        <div className="ml-auto">
          {item.configured ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-3 h-3" /> {item.source === "env" ? "Set in env" : "Saved"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-muted text-muted-foreground">
              Not set
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{item.description}</p>

      {item.configured && (
        <div className="text-[11px] text-muted-foreground font-mono">
          Current: {item.preview}
        </div>
      )}

      {isLovable ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">
          <Lock className="w-3.5 h-3.5" /> Auto-provisioned by Lovable — no action needed.
        </div>
      ) : isEnvLocked ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">
          <Lock className="w-3.5 h-3.5" /> This value is set via project environment variables and
          takes priority over anything saved here.
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type={show ? "text" : "password"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={item.configured ? "Enter a new value to replace…" : "Paste value here…"}
              autoComplete="off"
              spellCheck={false}
              disabled={disabled || saving}
              className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-sm font-mono"
            />
            {item.secret && (
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Hide" : "Show"}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => onSave(value)}
            disabled={!value.trim() || saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save
          </button>
          {item.configured && item.source === "db" && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Remove saved value for ${item.key}?`)) onSave("");
              }}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {item.docs && (
        <a
          href={item.docs}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Get from provider <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </li>
  );
}
