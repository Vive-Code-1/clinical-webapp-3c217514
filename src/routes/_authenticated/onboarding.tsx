import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  ssr: false,
  head: () => ({ meta: [{ title: "Setup your clinic — SANTÉ" }] }),
  component: OnboardingPage,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

function OnboardingPage() {
  const { t } = useTranslation();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const finalSlug = slug || slugify(name);
    const { data: clinic, error: clErr } = await supabase
      .from("clinics")
      .insert({ owner_id: user.id, name, slug: finalSlug })
      .select("id, slug")
      .single();

    if (clErr || !clinic) {
      setError(clErr?.message ?? "Failed to create clinic.");
      setLoading(false);
      return;
    }

    // Seed: default location + service + Mon-Fri 9-17 availability
    const { data: location } = await supabase
      .from("locations")
      .insert({ clinic_id: clinic.id, name: "Main office", country: "CA" })
      .select("id")
      .single();

    await supabase.from("service_types").insert({
      clinic_id: clinic.id,
      name: "Initial consultation",
      duration_minutes: 60,
      price_cents: 12000,
      color: "#7A5C3A",
    });

    const days: ("mon" | "tue" | "wed" | "thu" | "fri")[] = ["mon", "tue", "wed", "thu", "fri"];
    await supabase.from("availability_rules").insert(
      days.map((d) => ({
        clinic_id: clinic.id,
        practitioner_id: user.id,
        location_id: location?.id ?? null,
        day_of_week: d,
        start_time: "09:00",
        end_time: "17:00",
      })),
    );

    toast.success("Clinic created.");
    router.navigate({ to: "/calendar", search: { clinic: clinic.id } });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg animate-reveal">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Phase 2 · Setup
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
          Name your sanctuary.
        </h1>
        <p className="font-serif text-muted-foreground mb-10">
          We'll create your clinic, a default location, a first service, and Monday-Friday 9-5 availability. You can edit everything later.
        </p>

        <form onSubmit={onSubmit} className="bg-card rounded-3xl p-8 ring-1 ring-border shadow-xl space-y-5">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
              Clinic name
            </span>
            <input
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) setSlug(slugify(e.target.value));
              }}
              className="w-full bg-background border border-input rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Maple Therapy Clinic"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
              Booking URL slug
            </span>
            <div className="flex items-center gap-2 bg-background border border-input rounded-xl px-4 py-3">
              <span className="text-sm text-muted-foreground font-mono">/book/</span>
              <input
                required
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="flex-1 bg-transparent focus:outline-none font-mono text-sm"
                placeholder="maple-therapy"
              />
            </div>
          </label>

          {error && (
            <div className="text-sm font-medium text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !name}
            className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 hover:brightness-110 transition-all disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create clinic"}
          </button>
        </form>
      </div>
    </div>
  );
}
