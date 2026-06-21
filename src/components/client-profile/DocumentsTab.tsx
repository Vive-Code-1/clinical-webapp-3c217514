import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Download, Trash2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ClientDocument } from "./types";

export function DocumentsTab({ clinicId, clientId }: { clinicId: string; clientId: string }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const docs = useQuery({
    queryKey: ["client-documents", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_documents")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientDocument[];
    },
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name} is over 20MB`);
          continue;
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${clinicId}/${clientId}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from("client-documents").upload(path, file, {
          contentType: file.type || undefined,
        });
        if (upErr) {
          toast.error(`${file.name}: ${upErr.message}`);
          continue;
        }
        const { error: insErr } = await supabase.from("client_documents").insert({
          clinic_id: clinicId,
          client_id: clientId,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          category: "general",
          uploaded_by: userData.user?.id ?? null,
        });
        if (insErr) toast.error(insErr.message);
      }
      queryClient.invalidateQueries({ queryKey: ["client-documents", clientId] });
      toast.success("Upload complete");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(path, 60);
    if (error || !data) return toast.error(error?.message || "Download failed");
    const a = window.document.createElement("a");
    a.href = data.signedUrl;
    a.download = name;
    a.target = "_blank";
    a.rel = "noopener";
    window.document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const remove = useMutation({
    mutationFn: async (d: ClientDocument) => {
      await supabase.storage.from("client-documents").remove([d.storage_path]);
      const { error } = await supabase.from("client_documents").delete().eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-documents", clientId] });
      toast.success("Document removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Documents</h3>
        <label className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full h-9 px-4 text-sm font-semibold hover:brightness-110 cursor-pointer">
          <Upload className="w-4 h-4" />
          {uploading ? "Uploading…" : "Upload files"}
          <input
            type="file"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              handleUpload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {docs.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (docs.data ?? []).length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Drop files via the upload button (max 20MB each).</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {(docs.data ?? []).map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-3">
              <div className="w-10 h-10 rounded-lg bg-accent grid place-items-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{d.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {d.mime_type || "file"} ·{" "}
                  {d.size_bytes ? `${(d.size_bytes / 1024).toFixed(1)} KB` : "—"} ·{" "}
                  {new Date(d.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDownload(d.storage_path, d.file_name)}
                className="text-xs px-3 py-1.5 rounded-full bg-background ring-1 ring-border hover:bg-muted inline-flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Download
              </button>
              <button
                onClick={() => confirm(`Delete ${d.file_name}?`) && remove.mutate(d)}
                className="text-xs px-2 py-1.5 hover:bg-destructive/10 text-destructive rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
