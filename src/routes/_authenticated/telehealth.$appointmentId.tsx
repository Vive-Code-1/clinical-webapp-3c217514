import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/telehealth/$appointmentId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Telehealth — Helanthus" }] }),
  component: TelehealthRoom,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Appointment not found.</div>,
});

function TelehealthRoom() {
  const { appointmentId } = Route.useParams();
  const apt = useQuery({
    queryKey: ["appointment-telehealth", appointmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id, starts_at, ends_at, meeting_url, status, service:service_types(name, is_telehealth), clinic:clinics(name)",
        )
        .eq("id", appointmentId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  if (apt.isLoading) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }
  const a = apt.data;
  if (!a || !a.meeting_url) {
    return (
      <div className="p-8 max-w-xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">No video room</h1>
        <p className="text-sm text-muted-foreground">
          This appointment doesn't have a video room. Make sure the service is marked as telehealth.
        </p>
        <Link to="/calendar" className="text-sm text-primary underline">Back</Link>
      </div>
    );
  }

  // Use Jitsi Meet — no API key needed.
  const url = `${a.meeting_url}#config.prejoinPageEnabled=false`;

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <header className="flex items-center justify-between px-4 py-3 bg-zinc-900">
        <div className="flex items-center gap-3">
          <Link to="/calendar" className="inline-flex items-center gap-1 text-sm text-zinc-300 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="text-sm font-medium flex items-center gap-2">
            <Video className="w-4 h-4 text-emerald-400" />
            {a.service?.name ?? "Telehealth session"}
            <span className="text-zinc-400">· {a.clinic?.name ?? ""}</span>
          </div>
        </div>
        <a
          href={a.meeting_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20"
        >
          Open in new tab
        </a>
      </header>
      <iframe
        title="Telehealth video"
        src={url}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="flex-1 w-full border-0"
      />
    </div>
  );
}
