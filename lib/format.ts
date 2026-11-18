import type { Payment } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

/** Local date as yyyy-mm-dd */
export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseISO = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const todayISO = () => toISO(new Date());
export const addDays = (s: string, n: number) => {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const daysBetween = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
export const daysUntil = (s: string) => daysBetween(todayISO(), s);

export function money(n: number, currency = "INR") {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtDate(d: string) {
  return parseISO(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function timeAgo(iso: string) {
  const days = daysBetween(iso.slice(0, 10), todayISO());
  if (days <= 0) {
    const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
    return h < 1 ? "just now" : `${h}h ago`;
  }
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export type EffectiveStatus = "paid" | "partial" | "pending" | "overdue";

export const balance = (p: Payment) => Math.max(0, p.amount - (p.paidAmount || 0));

export function effectiveStatus(p: Payment): EffectiveStatus {
  if (p.status === "paid") return "paid";
  if (p.paidAmount > 0) return "partial";
  return p.dueDate < todayISO() ? "overdue" : "pending";
}

export function monthKey(d: string) {
  return d.slice(0, 7);
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short" });
}

export function lastMonths(n: number) {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
