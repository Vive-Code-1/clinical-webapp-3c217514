import { toast } from "sonner";
import { fmtMoney } from "./types";

const escapeHtml = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/**
 * Opens a new tab containing a printable HTML representation of the invoice.
 * The popup auto-triggers the browser print dialog (Save as PDF).
 */
export function openInvoicePdf(i: any, clinicName: string, balance: number) {
  const itemsHtml = (i.items ?? [])
    .map(
      (it: any) => `
      <tr>
        <td>${escapeHtml(it.description)}</td>
        <td class="r">${it.quantity}</td>
        <td class="r">${fmtMoney(it.unit_price_cents, i.currency)}</td>
        <td class="r">${(it.tax_rate_bps / 100).toFixed(1)}%</td>
        <td class="r">${fmtMoney(it.line_total_cents, i.currency)}</td>
      </tr>`,
    )
    .join("");
  const paymentsHtml = (i.payments ?? []).length
    ? `<h3>Payment history</h3><table class="t"><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="r">Amount</th></tr></thead><tbody>${i.payments
        .map(
          (p: any) =>
            `<tr><td>${new Date(p.received_at).toLocaleString()}</td><td>${escapeHtml(p.method)}</td><td>${escapeHtml(p.reference ?? "")}</td><td class="r">${fmtMoney(p.amount_cents, i.currency)}</td></tr>`,
        )
        .join("")}</tbody></table>`
    : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(i.invoice_number)}</title>
<style>
  *{box-sizing:border-box} body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111;margin:0;padding:40px;background:#fff}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:20px;margin-bottom:24px}
  .head h1{margin:0;font-size:32px;letter-spacing:-.5px}
  .meta{color:#666;font-size:13px}
  .pill{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:600;text-transform:uppercase;background:#eef;color:#225}
  .pill.paid{background:#e7f7ec;color:#137333}
  .pill.partially_paid{background:#fff3d6;color:#8a5a00}
  .pill.overdue,.pill.void{background:#fde2e2;color:#a4262c}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}
  .label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#666;margin-bottom:4px}
  .due{text-align:right}
  .due .amt{font-size:32px;font-weight:700;margin:4px 0}
  .t{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
  .t th,.t td{padding:10px 8px;border-bottom:1px solid #e4e4e7;text-align:left}
  .t th{font-size:11px;text-transform:uppercase;color:#666}
  .t .r{text-align:right}
  .totals{margin-left:auto;margin-top:14px;width:280px;font-size:13px}
  .totals .row{display:flex;justify-content:space-between;padding:4px 0}
  .totals .grand{font-weight:700;font-size:16px;border-top:2px solid #111;padding-top:8px;margin-top:8px}
  .notes{margin-top:24px;padding:14px;background:#f6f6f7;border-radius:8px;font-size:13px}
  .foot{margin-top:40px;text-align:center;color:#888;font-size:11px}
  h3{font-size:14px;margin:32px 0 8px;text-transform:uppercase;letter-spacing:.05em;color:#444}
  @media print{body{padding:24px}}
</style></head><body>
  <div class="head">
    <div>
      <div class="meta">${escapeHtml(clinicName)}</div>
      <h1>Invoice ${escapeHtml(i.invoice_number)}</h1>
      <div class="meta">${i.issued_at ? `Issued ${new Date(i.issued_at).toLocaleDateString()}` : "Draft"}${i.due_at ? ` · Due ${new Date(i.due_at).toLocaleDateString()}` : ""}</div>
    </div>
    <span class="pill ${escapeHtml(i.status)}">${escapeHtml(String(i.status).replace("_", " "))}</span>
  </div>
  <div class="grid">
    <div>
      <div class="label">Bill to</div>
      <div style="font-weight:600">${escapeHtml(i.client?.full_name ?? "—")}</div>
      <div class="meta">${escapeHtml(i.client?.email ?? "")}</div>
    </div>
    <div class="due">
      <div class="label">Amount due</div>
      <div class="amt">${fmtMoney(balance, i.currency)}</div>
      <div class="meta">of ${fmtMoney(i.total_cents, i.currency)}</div>
    </div>
  </div>
  <table class="t">
    <thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit</th><th class="r">Tax</th><th class="r">Total</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${fmtMoney(i.subtotal_cents, i.currency)}</span></div>
    <div class="row"><span>Tax</span><span>${fmtMoney(i.tax_cents, i.currency)}</span></div>
    <div class="row grand"><span>Total</span><span>${fmtMoney(i.total_cents, i.currency)}</span></div>
    <div class="row" style="color:#137333"><span>Paid</span><span>${fmtMoney(i.amount_paid_cents, i.currency)}</span></div>
    <div class="row grand"><span>Balance</span><span>${fmtMoney(balance, i.currency)}</span></div>
  </div>
  ${i.notes ? `<div class="notes"><div class="label">Notes</div>${escapeHtml(i.notes)}</div>` : ""}
  ${paymentsHtml}
  <div class="foot">Thank you for your business.</div>
  <script>window.onload=()=>{setTimeout(()=>window.print(),200)}</script>
</body></html>`;
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) {
    toast.error("Please allow pop-ups to download the PDF");
    return;
  }
  w.document.write(html);
  w.document.close();
}
