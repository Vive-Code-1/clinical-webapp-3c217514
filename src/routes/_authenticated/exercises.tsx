import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/queries/clinic";
import { Button } from "@/components/ui/button";
import { Dumbbell, Plus } from "lucide-react";
import { useAppTranslation } from "@/lib/i18n/app-translations";
import type { ExerciseRow } from "@/components/exercises/types";
import { ExerciseCard } from "@/components/exercises/ExerciseCard";
import { ExerciseDialog } from "@/components/exercises/ExerciseDialog";

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

function ExercisesPage() {
  const { clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const queryClient = useQueryClient();
  const { language } = useAppTranslation();

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
              <ExerciseCard
                key={ex.id}
                ex={ex}
                copy={headerCopy}
                onEdit={(e) => {
                  setEditing(e);
                  setOpen(true);
                }}
                onDelete={(id) => del.mutate(id)}
              />
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
