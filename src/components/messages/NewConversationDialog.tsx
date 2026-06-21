import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function NewConversationDialog({
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
