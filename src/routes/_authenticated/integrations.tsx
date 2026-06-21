import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/queries/clinic";
import {
  getIntegrationStatus,
  setIntegrationSecret,
} from "@/lib/functions/integrations";
import { SecretRow } from "@/components/integrations/SecretRow";
import { INTEGRATION_GROUPS } from "@/components/integrations/groups";

const searchSchema = z.object({ clinic: z.string().optional() });

export const Route = createFileRoute("/_authenticated/integrations")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async ({ context }) => {
    const clinics = await context.queryClient.ensureQueryData(myClinicsQuery(context.user.id));
    if (!clinics || clinics.length === 0) throw redirect({ to: "/onboarding" });
    return { clinics };
  },
  head: () => ({ meta: [{ title: "Integrations — Helanthus" }] }),
  component: IntegrationsPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

function IntegrationsPage() {
  const { clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const fetchStatus = useServerFn(getIntegrationStatus);
  const saveSecret = useServerFn(setIntegrationSecret);
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: ["integration-status"],
    queryFn: () => fetchStatus(),
    refetchOnWindowFocus: true,
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = `${origin}/api/public/stripe/webhook`;

  const copy = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} copied`))
      .catch(() => toast.error("Could not copy"));
  };

  const mutation = useMutation({
    mutationFn: (vars: { key: string; value: string }) => saveSecret({ data: vars }),
    onSuccess: (res, vars) => {
      toast.success(res.cleared ? `${vars.key} cleared` : `${vars.key} saved`);
      qc.invalidateQueries({ queryKey: ["integration-status"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Could not save"),
  });

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="p-6 md:p-8 max-w-4xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Paste each API key here and click Save. Features turn on the moment the matching key is
              saved — no redeploy needed.
            </p>
          </div>
          <button
            onClick={() => status.refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted"
            disabled={status.isFetching}
          >
            <RefreshCw className={`w-4 h-4 ${status.isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {status.isError && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {(status.error as Error)?.message}
          </div>
        )}

        {INTEGRATION_GROUPS.map((g) => {
          const items = (status.data ?? []).filter((s) => s.group === g.id);
          if (items.length === 0) return null;
          const Icon = g.icon;
          const required = items.filter((i) => i.required);
          const ready = required.length === 0 ? items.some((i) => i.configured) : required.every((i) => i.configured);
          return (
            <section key={g.id} className="rounded-2xl border border-border bg-card card-pop overflow-hidden">
              <header className="px-5 py-4 border-b border-border flex items-start gap-3">
                <div className="grid place-items-center w-9 h-9 rounded-lg bg-muted shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{g.title}</h2>
                    {ready ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        <AlertCircle className="w-3 h-3" /> Setup needed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{g.blurb}</p>
                </div>
              </header>

              {g.id === "payments" && (
                <div className="px-5 py-3 border-b border-border bg-muted/30 text-xs space-y-2">
                  <div className="font-semibold text-foreground">Webhook endpoint</div>
                  <div className="text-muted-foreground">
                    In Stripe Dashboard → Developers → Webhooks, add an endpoint with the URL below and
                    select event <code className="px-1 py-0.5 rounded bg-background border">checkout.session.completed</code>.
                    Then copy the signing secret (whsec_…) into the <code className="px-1 py-0.5 rounded bg-background border">STRIPE_WEBHOOK_SECRET</code> field below.
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded bg-background border border-border font-mono text-[11px] truncate">
                      {webhookUrl}
                    </code>
                    <button
                      onClick={() => copy(webhookUrl, "Webhook URL")}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-border hover:bg-muted"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                  </div>
                </div>
              )}

              <ul className="divide-y divide-border">
                {items.map((i) => (
                  <SecretRow
                    key={i.key}
                    item={i}
                    onSave={(value) => mutation.mutate({ key: i.key, value })}
                    saving={mutation.isPending && mutation.variables?.key === i.key}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
