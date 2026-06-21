import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { IntakeForm, IntakeResponse } from "./types";
import { FillFormDialog } from "./FillFormDialog";


export function IntakeTab({ clinicId, clientId }: { clinicId: string; clientId: string }) {
  const queryClient = useQueryClient();
  const [openFormId, setOpenFormId] = useState<string | null>(null);

  const forms = useQuery({
    queryKey: ["intake-forms-active", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intake_forms")
        .select("id, title, kind, schema")
        .eq("clinic_id", clinicId)
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return (data ?? []) as IntakeForm[];
    },
  });

  const responses = useQuery({
    queryKey: ["intake-responses", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intake_responses")
        .select("id, form_id, answers, signed_at, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as IntakeResponse[];
    },
  });

  const submit = useMutation({
    mutationFn: async ({ form, answers, signature }: { form: IntakeForm; answers: Record<string, unknown>; signature?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("intake_responses").insert({
        clinic_id: clinicId,
        form_id: form.id,
        client_id: clientId,
        answers: answers as never,
        signature: signature || null,
        signed_at: signature ? new Date().toISOString() : null,
        submitted_by: userData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intake-responses", clientId] });
      setOpenFormId(null);
      toast.success("Response saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeForm = (forms.data ?? []).find((f) => f.id === openFormId) ?? null;
  const formById = new Map((forms.data ?? []).map((f) => [f.id, f]));

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Available forms</h3>
          <Link
            to="/forms"
            search={{ clinic: clinicId }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Manage forms →
          </Link>
        </div>
        {forms.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (forms.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active forms. Create one in <strong>Forms</strong>.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {(forms.data ?? []).map((f) => (
              <button
                key={f.id}
                onClick={() => setOpenFormId(f.id)}
                className="text-left bg-muted/40 hover:bg-muted rounded-xl p-4"
              >
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{f.kind}</p>
                <p className="font-semibold text-sm mt-1">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {f.schema?.fields?.length ?? 0} field(s)
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="font-semibold mb-3">Submitted responses</h3>
        {responses.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (responses.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No responses yet.</p>
        ) : (
          <ul className="space-y-3">
            {(responses.data ?? []).map((r) => {
              const f = formById.get(r.form_id);
              return (
                <li key={r.id} className="bg-muted/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-pill-green/10 text-pill-green">
                      {f?.kind || "form"}
                    </span>
                    <p className="font-semibold text-sm">{f?.title || "(deleted form)"}</p>
                    {r.signed_at && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Signed {new Date(r.signed_at).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {f?.schema?.fields?.map((field) => (
                      <div key={field.key}>
                        <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{field.label}</dt>
                        <dd className="whitespace-pre-wrap">{String(r.answers?.[field.key] ?? "—")}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {activeForm && (
        <FillFormDialog
          form={activeForm}
          onClose={() => setOpenFormId(null)}
          onSubmit={(answers, signature) => submit.mutate({ form: activeForm, answers, signature })}
          pending={submit.isPending}
        />
      )}
    </div>
  );
}

