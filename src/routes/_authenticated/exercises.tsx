import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/queries/clinic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dumbbell, Plus, Video, Pencil, Trash2 } from "lucide-react";
import { useAppTranslation } from "@/lib/i18n/app-translations";

const searchSchema = z.object({ clinic: z.string().optional() });

export const Route = createFileRoute("/_authenticated/exercises")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Exercises — SANTÉ" }] }),
  component: ExercisesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

type ExerciseRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  video_url: string | null;
  image_url: string | null;
  instructions: string | null;
  default_sets: number | null;
  default_reps: number | null;
  default_duration_seconds: number | null;
};

function ExercisesPage() {
  const { clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const queryClient = useQueryClient();
  const { t, language } = useAppTranslation();

  const exercises = useQuery({
    queryKey: ["exercises", activeClinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select(
          "id, title, description, category, video_url, image_url, instructions, default_sets, default_reps, default_duration_seconds",
        )
        .eq("clinic_id", activeClinicId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExerciseRow[];
    },
  });

  const [editing, setEditing] = useState<ExerciseRow | null>(null);
  const [open, setOpen] = useState(false);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(language === "fr" ? "Exercice supprimé." : "Exercise removed.");
      queryClient.invalidateQueries({ queryKey: ["exercises", activeClinicId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const headerCopy =
    language === "fr"
      ? {
          eyebrow: "Bibliothèque",
          title: "Exercices & programmes à domicile",
          subtitle:
            "Construisez une bibliothèque d'exercices à prescrire à vos clients, avec vidéos, séries et instructions.",
          add: "Nouvel exercice",
          empty: "Aucun exercice pour le moment. Commencez votre bibliothèque.",
          edit: "Modifier",
          delete: "Supprimer",
          confirmDelete: "Supprimer cet exercice ?",
          sets: "séries",
          reps: "rép.",
          seconds: "sec",
          watch: "Vidéo",
        }
      : {
          eyebrow: "Library",
          title: "Exercises & home programs",
          subtitle:
            "Build a library of exercises you can prescribe to clients, with videos, sets, reps and instructions.",
          add: "New exercise",
          empty: "No exercises yet. Start building your library.",
          edit: "Edit",
          delete: "Delete",
          confirmDelete: "Delete this exercise?",
          sets: "sets",
          reps: "reps",
          seconds: "sec",
          watch: "Video",
        };

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="px-4 sm:px-8 py-6 sm:py-10 max-w-6xl">
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
              {headerCopy.eyebrow}
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{headerCopy.title}</h1>
            <p className="mt-2 text-sm font-serif text-muted-foreground max-w-2xl">
              {headerCopy.subtitle}
            </p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {headerCopy.add}
          </Button>
        </div>

        {exercises.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-card border border-border h-48 animate-pulse" />
            ))}
          </div>
        ) : (exercises.data ?? []).length === 0 ? (
          <div className="rounded-3xl bg-card border border-border p-12 text-center">
            <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">{headerCopy.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(exercises.data ?? []).map((ex) => (
              <div
                key={ex.id}
                className="rounded-2xl bg-card border border-border p-5 flex flex-col gap-3"
              >
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
                      aria-label={headerCopy.edit}
                      onClick={() => {
                        setEditing(ex);
                        setOpen(true);
                      }}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      aria-label={headerCopy.delete}
                      onClick={() => {
                        if (confirm(headerCopy.confirmDelete)) del.mutate(ex.id);
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
                      {ex.default_sets} {headerCopy.sets}
                    </span>
                  )}
                  {ex.default_reps != null && (
                    <span>
                      {ex.default_reps} {headerCopy.reps}
                    </span>
                  )}
                  {ex.default_duration_seconds != null && (
                    <span>
                      {ex.default_duration_seconds} {headerCopy.seconds}
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
                      {headerCopy.watch}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <ExerciseDialog
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          clinicId={activeClinicId}
          onSaved={() => {
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: ["exercises", activeClinicId] });
          }}
          language={language}
        />
      </div>
    </AppShell>
  );
}

function ExerciseDialog({
  open,
  onOpenChange,
  editing,
  clinicId,
  onSaved,
  language,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ExerciseRow | null;
  clinicId: string;
  onSaved: () => void;
  language: string;
}) {
  const labels =
    language === "fr"
      ? {
          new: "Nouvel exercice",
          edit: "Modifier l'exercice",
          title: "Titre",
          category: "Catégorie",
          description: "Description",
          instructions: "Instructions",
          video: "URL vidéo (YouTube, Vimeo)",
          sets: "Séries par défaut",
          reps: "Répétitions par défaut",
          duration: "Durée par défaut (sec)",
          cancel: "Annuler",
          save: "Enregistrer",
        }
      : {
          new: "New exercise",
          edit: "Edit exercise",
          title: "Title",
          category: "Category",
          description: "Description",
          instructions: "Instructions",
          video: "Video URL (YouTube, Vimeo)",
          sets: "Default sets",
          reps: "Default reps",
          duration: "Default duration (sec)",
          cancel: "Cancel",
          save: "Save",
        };

  const save = useMutation({
    mutationFn: async (form: FormData) => {
      const payload = {
        clinic_id: clinicId,
        title: String(form.get("title") || "").trim(),
        category: (String(form.get("category") || "").trim() || null) as string | null,
        description: (String(form.get("description") || "").trim() || null) as string | null,
        instructions: (String(form.get("instructions") || "").trim() || null) as string | null,
        video_url: (String(form.get("video_url") || "").trim() || null) as string | null,
        default_sets: parseIntOrNull(form.get("default_sets")),
        default_reps: parseIntOrNull(form.get("default_reps")),
        default_duration_seconds: parseIntOrNull(form.get("default_duration_seconds")),
      };
      if (!payload.title) throw new Error(language === "fr" ? "Titre requis" : "Title required");
      if (editing) {
        const { error } = await supabase.from("exercises").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("exercises").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(language === "fr" ? "Enregistré" : "Saved");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    save.mutate(new FormData(e.currentTarget));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? labels.edit : labels.new}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{labels.title}</Label>
            <Input id="title" name="title" defaultValue={editing?.title ?? ""} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">{labels.category}</Label>
            <Input id="category" name="category" defaultValue={editing?.category ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{labels.description}</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={editing?.description ?? ""}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instructions">{labels.instructions}</Label>
            <Textarea
              id="instructions"
              name="instructions"
              defaultValue={editing?.instructions ?? ""}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="video_url">{labels.video}</Label>
            <Input
              id="video_url"
              name="video_url"
              type="url"
              defaultValue={editing?.video_url ?? ""}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="default_sets">{labels.sets}</Label>
              <Input
                id="default_sets"
                name="default_sets"
                type="number"
                min="0"
                defaultValue={editing?.default_sets ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_reps">{labels.reps}</Label>
              <Input
                id="default_reps"
                name="default_reps"
                type="number"
                min="0"
                defaultValue={editing?.default_reps ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_duration_seconds">{labels.duration}</Label>
              <Input
                id="default_duration_seconds"
                name="default_duration_seconds"
                type="number"
                min="0"
                defaultValue={editing?.default_duration_seconds ?? ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {labels.cancel}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {labels.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function parseIntOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}
