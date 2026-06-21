export type Booking = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  meeting_url: string | null;
  clinic: { id: string; name: string; slug: string; brand_color: string | null } | null;
  service: { name: string; color: string; duration_minutes: number } | null;
  practitioner_id: string;
  practitioner_name: string | null;
};
