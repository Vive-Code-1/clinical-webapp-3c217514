import { Pencil, Trash2, Video } from "lucide-react";
import type { ExerciseRow } from "./types";

type Copy = {
  edit: string;
  delete: string;
  confirmDelete: string;
  sets: string;
  reps: string;
  seconds: string;
  watch: string;
};

export function ExerciseCard({
  ex,
  copy,
  onEdit,
  onDelete,
}: {
  ex: ExerciseRow;
  copy: Copy;
  onEdit: (ex: ExerciseRow) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {ex.category && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
              {ex.category}
            </p>
          )}
          <h3 className="font-semibold text-foreground truncate">{ex.title}</h3>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            aria-label={copy.edit}
            onClick={() => onEdit(ex)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            aria-label={copy.delete}
            onClick={() => {
              if (confirm(copy.confirmDelete)) onDelete(ex.id);
            }}
            className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {ex.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{ex.description}</p>
      )}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-2 border-t border-border">
        {ex.default_sets != null && (
          <span>
            {ex.default_sets} {copy.sets}
          </span>
        )}
        {ex.default_reps != null && (
          <span>
            {ex.default_reps} {copy.reps}
          </span>
        )}
        {ex.default_duration_seconds != null && (
          <span>
            {ex.default_duration_seconds} {copy.seconds}
          </span>
        )}
        {ex.video_url && (
          <a
            href={ex.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-primary font-medium"
          >
            <Video className="w-3 h-3" />
            {copy.watch}
          </a>
        )}
      </div>
    </div>
  );
}
