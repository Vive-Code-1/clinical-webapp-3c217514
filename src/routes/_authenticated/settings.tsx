import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/queries/clinic";
import { useAppTranslation } from "@/lib/i18n/app-translations";
import { LanguageSection } from "@/components/settings/LanguageSection";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { BrandingSection } from "@/components/settings/BrandingSection";
import { AiScribeSection } from "@/components/settings/AiScribeSection";

const searchSchema = z.object({ clinic: z.string().optional() });

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics, user: context.user };
  },
  head: () => ({ meta: [{ title: "Settings — Helanthus" }] }),
  component: SettingsPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

function SettingsPage() {
  const { clinics, user } = Route.useRouteContext();
  const search = Route.useSearch();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const { t } = useAppTranslation();

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("app.settings.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("app.settings.subtitle")}</p>
        </div>

        <LanguageSection />
        <ProfileSection userId={user.id} />
        <BrandingSection clinicId={activeClinicId} />
        <AiScribeSection />
      </div>
    </AppShell>
  );
}
