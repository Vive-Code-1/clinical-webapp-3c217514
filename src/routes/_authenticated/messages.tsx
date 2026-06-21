import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { MessageSquare, Send, Plus, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/clinic-queries";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const searchSchema = z.object({
  clinic: z.string().optional(),
  c: z.string().optional(), // active conversation id
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

type Conv = {
  id: string;
  subject: string | null;
  last_message_at: string;
  clinic_id: string;
  client_id: string;
  practitioner_id: string;
  client: { full_name: string | null } | null;
  practitioner: { full_name: string | null } | null;
};

type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

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

  // Realtime: refresh list on any change
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
    navigate({ search: (p) => ({ ...p, c: id ?? undefined }) });

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="h-[calc(100vh-2rem)] flex rounded-3xl overflow-hidden bg-card border border-border">
        <aside className="w-80 shrink-0 border-r border-border flex flex-col">
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

        <section className="flex-1 min-w-0 flex flex-col">
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

function ConversationView({
  conversationId,
  userId,
  onBack,
}: {
  conversationId: string;
  userId: string;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const msgs = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async (): Promise<Msg[]> => {
      const { data, error } = await (supabase as any)
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Msg[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`msgs-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversationId, queryClient]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs.data?.length]);

  const send = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await (supabase as any).from("messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        body: text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = body.trim();
    if (!t) return;
    send.mutate(t);
  };

  return (
    <>
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 md:hidden">
        <button onClick={onBack} className="text-sm text-muted-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-2 bg-muted/20">
        {msgs.data?.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                  mine ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                }`}
              >
                {m.body}
                <div className={`text-[10px] mt-1 ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={submit} className="border-t border-border p-3 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
        />
        <button
          type="submit"
          disabled={send.isPending || !body.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
        >
          <Send className="w-4 h-4" /> Send
        </button>
      </form>
    </>
  );
}

function NewConversationDialog({
  open,
  onOpenChange,
  clinicId,
  practitionerId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clinicId: string;
  practitionerId: string;
  onCreated: (id: string) => void;
}) {
  const [clientId, setClientId] = useState("");
  const [subject, setSubject] = useState("");

  const clients = useQuery({
    queryKey: ["clinic-clients-mini", clinicId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_clients")
        .select("id, full_name, email")
        .eq("clinic_id", clinicId)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Pick a client");
      const { data, error } = await (supabase as any)
        .from("conversations")
        .insert({
          clinic_id: clinicId,
          client_id: clientId,
          practitioner_id: practitionerId,
          subject: subject.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => onCreated(id),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Client</span>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
            >
              <option value="">Choose a client…</option>
              {clients.data?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} {c.email ? `· ${c.email}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Subject (optional)</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
          </label>
        </div>
        <DialogFooter>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending || !clientId}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
          >
            {create.isPending ? "Creating…" : "Start conversation"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
