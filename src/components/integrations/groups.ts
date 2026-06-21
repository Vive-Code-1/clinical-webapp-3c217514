import { CreditCard, Mail, MessageSquare, Sparkles } from "lucide-react";
import type { IntegrationStatus } from "@/lib/functions/integrations";

export const INTEGRATION_GROUPS: {
  id: IntegrationStatus["group"];
  title: string;
  icon: any;
  blurb: string;
}[] = [
  {
    id: "payments",
    title: "Payments — Stripe",
    icon: CreditCard,
    blurb: "Lets clients pay invoices online with cards via Stripe Checkout.",
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
    blurb: "Sends invoices, reminders and password-reset emails from your own domain.",
  },
  {
    id: "ai",
    title: "AI Scribe — Lovable AI",
    icon: Sparkles,
    blurb: "Optional. Transcribes session audio and drafts SOAP notes.",
  },
];
