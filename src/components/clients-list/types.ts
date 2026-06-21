export type ClientRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  notes: string | null;
  tags: string[];
  user_id: string | null;
  created_at: string;
};

export type ApptRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  service: { name: string; color: string } | null;
};
