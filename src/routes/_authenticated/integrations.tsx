import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  CreditCard,
  MessageSquare,
  Mail,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { myClinicsQuery } from "@/lib/clinic-queries";
import { getIntegrationStatus, type IntegrationStatus } from "@/lib/integrations.functions";

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

const GROUPS: { id: IntegrationStatus["group"]; title: string; icon: any; blurb: string }[] = [
  {
    id: "payments",
    title: "Payments — Stripe",
    icon: CreditCard,
    blurb:
      "Lets clients pay invoices online with cards via Stripe Checkout. Webhook records the payment automatically.",
  },
  {
    id: "messaging",
    title: "SMS reminders — Twilio",
    icon: MessageSquare,
    blurb: "Sends SMS appointment reminders.",
  },
  {
    id: "email",
    title: "Transactional email — Resend",
    icon: Mail,
    blurb: "Sends emails (invoices, reminders, password reset) from your own domain.",
  },
  {
    id: "ai",
    title: "AI Scribe — Lovable AI",
    icon: Sparkles,
    blurb: "Optional. Transcribes session audio and drafts SOAP notes.",
  },
];

function IntegrationsPage() {
  const { clinics } = Route.useRouteContext();
  const search = Route.useSearch();
  const activeClinicId = search.clinic ?? clinics[0]!.id;
  const fetchStatus = useServerFn(getIntegrationStatus);

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

  return (
    <AppShell clinicId={activeClinicId}>
      <div className="p-6 md:p-8 max-w-4xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Add API keys here to switch features on. Everything is wired — features activate the moment the
              matching secret is set.
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

        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="text-sm font-semibold">How to add a key</div>
          <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
            <li>
              Open <span className="font-semibold text-foreground">Project Settings → Secrets</span> from
              the bottom-left workspace menu.
            </li>
            <li>
              Click <span className="font-semibold text-foreground">Add secret</span>, paste the exact key
              name shown below, then paste the value from the provider.
            </li>
            <li>Save. Come back here and click Refresh — the status badge should turn green.</li>
          </ol>
        </div>

        {GROUPS.map((g) => {
          const items = (status.data ?? []).filter((s) => s.group === g.id);
          if (items.length === 0) return null;
          const Icon = g.icon;
          const ready = items.filter((i) => i.required).every((i) => i.configured);
          return (
            <section key={g.id} className="rounded-2xl border border-border bg-card overflow-hidden">
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
                    Then copy the signing secret (whsec_…) into <code className="px-1 py-0.5 rounded bg-background border">STRIPE_WEBHOOK_SECRET</code>.
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
                  <li key={i.key} className="px-5 py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code
                          className="font-mono text-xs px-2 py-1 rounded bg-muted border border-border cursor-pointer"
                          onClick={() => copy(i.key, "Key name")}
                          title="Click to copy"
                        >
                          {i.key}
                        </code>
                        <span className="text-sm font-medium">{i.label}</span>
                        {!i.required && (
                          <span className="text-[10px] uppercase text-muted-foreground font-bold">
                            optional
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{i.description}</p>
                      {i.docs && (
                        <a
                          href={i.docs}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          Get from provider <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="shrink-0 pt-1">
                      {i.configured ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-muted text-muted-foreground">
                          Not set
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
