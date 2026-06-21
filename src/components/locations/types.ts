export type Location = {
  id: string;
  clinic_id: string;
  name: string;
  address_line1: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string;
  phone: string | null;
  is_active: boolean;
};

export type Room = {
  id: string;
  location_id: string;
  name: string;
  capacity: number;
  is_active: boolean;
};
