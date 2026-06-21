import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/queries/clinic";
import { TaxRatesSection } from "@/components/billing-settings/TaxRatesSection";
import { RemindersSection } from "@/components/billing-settings/RemindersSection";
import { SavedCardsSection } from "@/components/billing-settings/SavedCardsSection";

const searchSchema = z.object({ clinic: z.string().optional(), setup: z.string().optional() });

export const Route = createFileRoute("/_authenticated/billing-settings")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Billing Settings — SANTÉ" }] }),
  component: BillingSettingsPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

function BillingSettingsPage() {
  const { clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const activeClinicId = search.clinic ?? clinics[0]!.id;

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="p-4 sm:p-6 md:p-8 max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">Billing settings</h1>
        <p className="text-muted-foreground mb-6">Tax rates and reminder configuration</p>

        <TaxRatesSection clinicId={activeClinicId} />
        <RemindersSection clinicId={activeClinicId} />
        <SavedCardsSection
          clinicId={activeClinicId}
          setupParam={search.setup}
          clearSetupParam={() =>
            navigate({ search: (p: any) => ({ ...p, setup: undefined }), replace: true })
          }
        />
      </div>
    </AppShell>
  );
}
