import type { Customer, Cycle, Payment, Product, Settings, Subscription, TemplateKind } from "./types";
import { balance, daysBetween, daysUntil, fmtDate, money, parseISO, toISO, todayISO, uid } from "./format";

export const CYCLE_MONTHS: Record<Cycle, number> = { monthly: 1, quarterly: 3, half_yearly: 6, yearly: 12 };
export const CYCLE_LABEL: Record<Cycle, string> = { monthly: "Monthly", quarterly: "Quarterly", half_yearly: "Half-yearly", yearly: "Yearly" };
export const CYCLE_SHORT: Record<Cycle, string> = { monthly: "/mo", quarterly: "/qtr", half_yearly: "/6mo", yearly: "/yr" };

export function addCycle(s: string, c: Cycle) {
  const d = parseISO(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + CYCLE_MONTHS[c]);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
}

const monShort = (s: string) => parseISO(s).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

export function periodLabel(due: string, cycle: Cycle) {
  if (cycle === "monthly") return monShort(due);
  const end = parseISO(addCycle(due, cycle));
  end.setDate(end.getDate() - 1);
  return `${monShort(due)} – ${monShort(toISO(end))}`;
}

/** Monthly recurring revenue of a subscription */
export const mrrOf = (s: Subscription) => (s.status === "active" ? s.price / CYCLE_MONTHS[s.cycle] : 0);

export function makeInvoice(s: Subscription, c: Customer | undefined, pr: Product | undefined, due: string, no: number): Payment {
  const period = periodLabel(due, s.cycle);
  return {
    id: uid(),
    title: `${pr?.name ?? "Subscription"} · ${period}`,
    invoiceNo: `INV-${no}`,
    customer: c?.name ?? "Unknown customer",
    customerId: s.customerId,
    subscriptionId: s.id,
    productId: s.productId,
    period,
    amount: s.price,
    paidAmount: 0,
    type: "incoming",
    method: "UPI",
    category: "Subscription",
    dueDate: due,
    status: "pending",
    approval: "approved",
    repId: s.repId,
    createdBy: "system",
    createdAt: new Date().toISOString(),
    receipts: [],
    reminders: [],
    followUps: [],
  };
}

/** Create invoices for every active subscription whose next bill date is on/before `until` */
export function generateInvoices(subs: Subscription[], customers: Customer[], products: Product[], counter: number, until: string) {
  const payments: Payment[] = [];
  const out = subs.map((s) => {
    if (s.status !== "active") return s;
    let next = s.nextDueDate;
    let guard = 0;
    while (next <= until && guard++ < 120) {
      payments.push(makeInvoice(s, customers.find((c) => c.id === s.customerId), products.find((p) => p.id === s.productId), next, counter++));
      next = addCycle(next, s.cycle);
    }
    return next === s.nextDueDate ? s : { ...s, nextDueDate: next };
  });
  return { payments, subs: out, counter };
}

/* ---------------- Reminders ---------------- */

export type Bucket = "overdue" | "today" | "upcoming" | "later";

/** Unpaid incoming invoices. Manual entries must be approved first; subscription invoices always count. */
export const isRemindable = (p: Payment) =>
  p.type === "incoming" && p.status !== "paid" && balance(p) > 0 && (p.approval === "approved" || (!!p.subscriptionId && p.approval !== "rejected"));

export const isSnoozed = (p: Payment) => !!p.snoozedUntil && p.snoozedUntil > todayISO();

export const lastReminder = (p: Payment) => p.reminders[p.reminders.length - 1];

export function bucketOf(p: Payment, s: Settings): Bucket {
  const d = daysUntil(p.dueDate);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= Math.max(0, ...s.reminderDays)) return "upcoming";
  return "later";
}

export function templateKind(p: Payment): TemplateKind {
  const d = daysUntil(p.dueDate);
  return d < 0 ? "overdue" : d === 0 ? "due" : "upcoming";
}

/** Should this invoice get a reminder today according to the schedule? */
export function needsReminderToday(p: Payment, s: Settings) {
  if (!isRemindable(p) || isSnoozed(p)) return false;
  const today = todayISO();
  const last = lastReminder(p);
  if (last && last.date === today) return false;
  if (p.promiseDate && p.promiseDate >= today) return false; // customer promised – wait
  const d = daysUntil(p.dueDate);
  if (d < 0) return !last || daysBetween(last.date, today) >= s.overdueEvery;
  if (d === 0) return true;
  const maxDays = Math.max(0, ...s.reminderDays);
  if (d > maxDays) return false;
  // a scheduled day, or we've never reminded and are inside the window
  return s.reminderDays.includes(d) || !last;
}

export function dueLabel(p: Payment) {
  const d = daysUntil(p.dueDate);
  if (d < 0) return { text: `${-d}d overdue`, cls: "b-red" };
  if (d === 0) return { text: "Due today", cls: "b-orange" };
  return { text: `in ${d}d`, cls: "b-blue" };
}

export function fillTemplate(tpl: string, p: Payment, ctx: { customer?: Customer; product?: Product; settings: Settings }) {
  const d = daysUntil(p.dueDate);
  const vars: Record<string, string> = {
    customer: ctx.customer?.contact || p.customer,
    company: ctx.settings.companyName,
    product: ctx.product?.name ?? p.title,
    amount: money(balance(p), ctx.settings.currency),
    total: money(p.amount, ctx.settings.currency),
    due_date: fmtDate(p.dueDate),
    days: String(Math.abs(d)),
    invoice: p.invoiceNo ?? p.title,
    period: p.period ?? "",
    upi: ctx.settings.upiId,
  };
  return tpl.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

export const TEMPLATE_VARS = ["customer", "company", "product", "amount", "total", "due_date", "days", "invoice", "period", "upi"];

/* ---------------- Contact links ---------------- */

export const phoneDigits = (ph: string) => {
  let d = ph.replace(/\D/g, "");
  if (d.length === 10) d = "91" + d;
  return d;
};
export const waLink = (ph: string, text: string) => `https://wa.me/${phoneDigits(ph)}?text=${encodeURIComponent(text)}`;
export const smsLink = (ph: string, text: string) => `sms:${ph}?body=${encodeURIComponent(text)}`;
export const telLink = (ph: string) => `tel:${ph}`;
export const mailLink = (email: string, subject: string, body: string) =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

/* ---------------- Printable invoice ---------------- */

export function printInvoice(p: Payment, c: Customer | undefined, pr: Product | undefined, s: Settings) {
  const w = window.open("", "_blank", "width=820,height=960");
  if (!w) return alert("Please allow pop-ups to print invoices.");
  const m = (n: number) => money(n, s.currency);
  const tax = pr ? Math.round((p.amount * pr.taxRate) / (100 + pr.taxRate)) : 0;
  w.document.write(`<!doctype html><html><head><title>${p.invoiceNo ?? "Invoice"}</title>
  <style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a2e;padding:48px;max-width:760px;margin:auto}
    .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #e87722;padding-bottom:20px}
    h1{margin:0;color:#e87722;font-size:28px} .muted{color:#6e6e73;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:28px} th,td{text-align:left;padding:12px;border-bottom:1px solid #eee}
    th{font-size:12px;text-transform:uppercase;color:#6e6e73} .r{text-align:right}
    .tot td{font-weight:700;font-size:16px} .badge{display:inline-block;padding:4px 12px;border-radius:99px;background:${p.status === "paid" ? "#e6f6ec;color:#1f9d55" : "rgba(232,119,34,.12);color:#d45f1a"};font-weight:700;font-size:12px}
  </style></head><body>
  <div class="top"><div><h1>${s.companyName}</h1><div class="muted">Tax Invoice</div></div>
  <div style="text-align:right"><b>${p.invoiceNo ?? p.id}</b><div class="muted">Due ${fmtDate(p.dueDate)}</div><div style="margin-top:8px" class="badge">${p.status === "paid" ? "PAID" : "UNPAID"}</div></div></div>
  <div style="margin-top:24px"><div class="muted">Bill to</div><b>${p.customer}</b><div class="muted">${c ? `${c.contact} · ${c.phone} · ${c.email}<br>${c.city}` : ""}</div></div>
  <table><thead><tr><th>Description</th><th>Period</th><th class="r">Amount</th></tr></thead><tbody>
  <tr><td>${pr?.name ?? p.title}${pr?.sku ? ` <span class="muted">(${pr.sku})</span>` : ""}</td><td>${p.period ?? "-"}</td><td class="r">${m(p.amount)}</td></tr>
  ${tax ? `<tr><td colspan="2" class="muted">Includes GST @ ${pr?.taxRate}%</td><td class="r muted">${m(tax)}</td></tr>` : ""}
  <tr><td colspan="2">Paid</td><td class="r">${m(p.paidAmount)}</td></tr>
  <tr class="tot"><td colspan="2">Balance due</td><td class="r">${m(balance(p))}</td></tr></tbody></table>
  ${s.upiId ? `<p style="margin-top:28px">Pay via UPI: <b>${s.upiId}</b></p>` : ""}
  <p class="muted" style="margin-top:40px">Thank you for your business.</p>
  <script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}
