import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Msg } from "./types";

export function ConversationView({
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
