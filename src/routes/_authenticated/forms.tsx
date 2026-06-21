import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { ClipboardList, FileText } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/queries/clinic";
import { IntakeFormsSection } from "@/components/forms-builder/IntakeFormsSection";
import { NoteTemplatesSection } from "@/components/forms-builder/NoteTemplatesSection";

const searchSchema = z.object({
  clinic: z.string().optional(),
  tab: z.enum(["intake", "templates"]).optional(),
});

export const Route = createFileRoute("/_authenticated/forms")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Forms & templates — Helanthus" }] }),
  component: FormsPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

function FormsPage() {
  const { clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const tab = search.tab ?? "intake";

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-[1200px] mx-auto">
        <header className="mb-6">
          <p className="text-sm text-muted-foreground">Clinical setup</p>
          <h1 className="text-2xl font-bold tracking-tight">Forms & templates</h1>
        </header>

        <div className="bg-card rounded-2xl ring-1 ring-border card-pop overflow-hidden">
          <div className="border-b border-border px-1 sm:px-2 flex gap-1 overflow-x-auto">
            {[
              { id: "intake" as const, label: "Intake & consent forms", icon: ClipboardList },
              { id: "templates" as const, label: "Clinical note templates", icon: FileText },
            ].map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => navigate({ search: { clinic: activeClinicId, tab: t.id === "intake" ? undefined : t.id } })}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="p-4 sm:p-6">
            {tab === "intake" ? <IntakeFormsSection clinicId={activeClinicId} /> : <NoteTemplatesSection clinicId={activeClinicId} />}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
