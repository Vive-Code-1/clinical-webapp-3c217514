import { type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
import { parseIntOrNull, type ExerciseRow } from "./types";

export function ExerciseDialog({
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
