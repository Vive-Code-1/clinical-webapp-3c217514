export type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  color: string;
  is_active: boolean;
  online_bookable: boolean;
  is_telehealth: boolean;
};
