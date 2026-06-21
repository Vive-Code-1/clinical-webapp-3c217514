
-- LEADS TABLE
CREATE TABLE public.home_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  service text,
  locale text NOT NULL DEFAULT 'en',
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.home_leads TO anon;
GRANT SELECT, INSERT ON public.home_leads TO authenticated;
GRANT ALL ON public.home_leads TO service_role;

ALTER TABLE public.home_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead"
  ON public.home_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read leads"
  ON public.home_leads FOR SELECT
  TO authenticated
  USING (true);

-- ANALYTICS EVENTS TABLE
CREATE TABLE public.home_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  path text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.home_analytics_events TO anon;
GRANT SELECT, INSERT ON public.home_analytics_events TO authenticated;
GRANT ALL ON public.home_analytics_events TO service_role;

ALTER TABLE public.home_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log analytics events"
  ON public.home_analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read analytics events"
  ON public.home_analytics_events FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX home_analytics_events_event_locale_idx
  ON public.home_analytics_events (event, locale, created_at DESC);
