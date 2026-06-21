import { FileText, CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";

/** Money formatter used across the invoice screens. */
export const fmtMoney = (cents: number, ccy = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: ccy }).format(cents / 100);

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  currency: string;
  total_cents: number;
  amount_paid_cents: number;
  issued_at: string | null;
  due_at: string | null;
  client_id: string | null;
  client?: { full_name: string; email: string | null } | null;
};

export type ClientLite = { id: string; full_name: string };
export type ServiceLite = { id: string; name: string; price_cents: number; currency: string };

export const STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  partially_paid: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-800",
  void: "bg-gray-200 text-gray-600",
};

export const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  draft: FileText,
  sent: Clock,
  paid: CheckCircle2,
  partially_paid: AlertCircle,
  overdue: AlertCircle,
  void: XCircle,
};
