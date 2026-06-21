import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { MessageSquare, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/queries/clinic";
import type { Conv } from "@/components/messages/types";
import { ConversationView } from "@/components/messages/ConversationView";
import { NewConversationDialog } from "@/components/messages/NewConversationDialog";

const searchSchema = z.object({
  clinic: z.string().optional(),
  c: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/messages")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    return { clinics: clinics ?? [] };
  },
  head: () => ({ meta: [{ title: "Messages — Helanthus" }] }),
  component: MessagesPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

function MessagesPage() {
  const { clinics, user } = Route.useRouteContext() as any;
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const activeClinicId = search.clinic ?? clinics[0]?.id;
  const activeConvId = search.c ?? null;
  const isStaff = clinics.length > 0;
  const [newOpen, setNewOpen] = useState(false);

  const conversations = useQuery({
    queryKey: ["conversations", activeClinicId ?? "client", user.id],
    queryFn: async (): Promise<Conv[]> => {
      const sb: any = supabase;
      let q = sb
        .from("conversations")
        .select(
          "id, subject, last_message_at, clinic_id, client_id, practitioner_id, client:clinic_clients(full_name), practitioner:profiles!conversations_practitioner_id_fkey(full_name)",
        )
        .order("last_message_at", { ascending: false });
      if (isStaff && activeClinicId) q = q.eq("clinic_id", activeClinicId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Conv[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("conv-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [queryClient]);

  const setConv = (id: string | null) =>
    navigate({ search: (p: z.infer<typeof searchSchema>) => ({ ...p, c: id ?? undefined }) });

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="h-[calc(100vh-2rem)] flex rounded-3xl overflow-hidden bg-card border border-border card-pop">
        <aside
          className={`${activeConvId ? "hidden md:flex" : "flex"} w-full md:w-80 md:shrink-0 border-r border-border flex-col`}
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Messages
            </h2>
            {isStaff && (
              <button
                onClick={() => setNewOpen(true)}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {conversations.isLoading && (
              <div className="p-4 text-xs text-muted-foreground">Loading…</div>
            )}
            {conversations.data?.length === 0 && (
              <div className="p-6 text-xs text-muted-foreground text-center">
                No conversations yet.
              </div>
            )}
            {conversations.data?.map((c) => {
              const otherName = isStaff
                ? c.client?.full_name ?? "Client"
                : c.practitioner?.full_name ?? "Practitioner";
              return (
                <button
                  key={c.id}
                  onClick={() => setConv(c.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 ${
                    activeConvId === c.id ? "bg-muted/70" : ""
                  }`}
                >
                  <div className="font-medium text-sm truncate">{otherName}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.subject ?? "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(c.last_message_at).toLocaleString()}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section
          className={`${activeConvId ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col`}
        >
          {activeConvId ? (
            <ConversationView
              key={activeConvId}
              conversationId={activeConvId}
              userId={user.id}
              onBack={() => setConv(null)}
            />
          ) : (
            <div className="flex-1 grid place-items-center text-sm text-muted-foreground">
              Select a conversation
            </div>
          )}
        </section>
      </div>

      {isStaff && activeClinicId && (
        <NewConversationDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          clinicId={activeClinicId}
          practitionerId={user.id}
          onCreated={(id) => {
            setNewOpen(false);
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            setConv(id);
          }}
        />
      )}
    </AppShell>
  );
}
