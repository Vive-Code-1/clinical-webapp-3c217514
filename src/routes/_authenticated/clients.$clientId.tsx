import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Upload,
  FileText,
  ClipboardList,
  Heart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/queries/clinic";
import { OverviewTab } from "@/components/client-profile/OverviewTab";
import { NotesTab } from "@/components/client-profile/NotesTab";
import { DocumentsTab } from "@/components/client-profile/DocumentsTab";
import { IntakeTab } from "@/components/client-profile/IntakeTab";
import { HistoryTab } from "@/components/client-profile/HistoryTab";

const searchSchema = z.object({
  clinic: z.string().optional(),
  tab: z.enum(["overview", "notes", "documents", "intake", "history"]).optional(),
});

export const Route = createFileRoute("/_authenticated/clients/$clientId")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Client profile — Helanthus" }] }),
  component: ClientProfilePage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Client not found.</div>,
});

type Tab = "overview" | "notes" | "documents" | "intake" | "history";

function ClientProfilePage() {
  const { clinics } = Route.useRouteContext();
  const { clientId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const tab: Tab = search.tab ?? "overview";

  const client = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_clients")
        .select("*")
        .eq("id", clientId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const setTab = (t: Tab) =>
    navigate({ search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, tab: t === "overview" ? undefined : t }) });

  const c = client.data;

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        <Link
          to="/clients"
          search={{ clinic: activeClinicId }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to clients
        </Link>

        {client.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !c ? (
          <p className="text-sm text-muted-foreground">Client not found.</p>
        ) : (
          <>
            <header className="bg-card rounded-2xl ring-1 ring-border card-pop p-6 mb-4 flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-pill-green text-primary-foreground grid place-items-center font-bold text-2xl shrink-0">
                {c.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold tracking-tight truncate">{c.full_name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                  {c.email && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> {c.email}
                    </span>
                  )}
                  {c.phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> {c.phone}
                    </span>
                  )}
                  {c.date_of_birth && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> {new Date(c.date_of_birth).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </header>

            <div className="bg-card rounded-2xl ring-1 ring-border card-pop overflow-hidden">
              <div className="border-b border-border px-2 flex gap-1 overflow-x-auto">
                {[
                  { id: "overview" as Tab, label: "Overview", icon: Heart },
                  { id: "notes" as Tab, label: "Clinical notes", icon: FileText },
                  { id: "documents" as Tab, label: "Documents", icon: Upload },
                  { id: "intake" as Tab, label: "Intake & consent", icon: ClipboardList },
                  { id: "history" as Tab, label: "Appointments", icon: Calendar },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                        active
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="p-6">
                {tab === "overview" && <OverviewTab clinicId={activeClinicId} clientId={clientId} client={c} />}
                {tab === "notes" && <NotesTab clinicId={activeClinicId} clientId={clientId} />}
                {tab === "documents" && <DocumentsTab clinicId={activeClinicId} clientId={clientId} />}
                {tab === "intake" && <IntakeTab clinicId={activeClinicId} clientId={clientId} />}
                {tab === "history" && <HistoryTab clinicId={activeClinicId} client={c} />}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
