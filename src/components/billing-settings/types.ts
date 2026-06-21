export type Tax = { id: string; name: string; rate_bps: number; is_default: boolean };

export type Reminders = {
  email_enabled: boolean;
  sms_enabled: boolean;
  hours_before: number;
  send_confirmations: boolean;
  twilio_from: string | null;
};

export type SavedCard = {
  id: string;
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  is_default: boolean;
};
