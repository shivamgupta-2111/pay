import type { Payment, Settings, User, Approval } from "./types";

export const SEED_USERS: User[] = [
  { id: "u-ceo", name: "Vikram Mehta", email: "ceo@company.com", role: "ceo", region: "HQ", target: 0, active: true },
  { id: "u-admin", name: "Priya Sharma", email: "admin@company.com", role: "admin", region: "HQ", target: 0, active: true },
  { id: "u-rep1", name: "Rahul Verma", email: "rahul@company.com", role: "rep", region: "North", target: 400000, active: true },
  { id: "u-rep2", name: "Ananya Iyer", email: "ananya@company.com", role: "rep", region: "South", target: 350000, active: true },
  { id: "u-rep3", name: "Karan Singh", email: "karan@company.com", role: "rep", region: "West", target: 300000, active: true },
  { id: "u-rep4", name: "Sneha Patel", email: "sneha@company.com", role: "rep", region: "East", target: 300000, active: true },
];

export const SEED_SETTINGS: Settings = {
  adminLimit: 100000,
  currency: "INR",
  categories: ["Sales", "Subscription", "Services", "Rent", "Salary", "Utilities", "Travel", "Marketing"],
  methods: ["UPI", "Bank Transfer", "Card", "Cash", "Cheque"],
};

const CUSTOMERS = [
  "Acme Traders", "Blue Ocean Pvt Ltd", "Sunrise Retail", "Nova Foods", "Metro Pharma",
  "Greenleaf Agro", "Pixel Studios", "Urban Mart", "Zenith Motors", "Orbit Logistics",
];

/** Deterministic pseudo-random so the demo data is stable */
function rng(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export function seedPayments(): Payment[] {
  const r = rng(42);
  const reps = SEED_USERS.filter((u) => u.role === "rep");
  const now = new Date();
  const out: Payment[] = [];
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];

  for (let i = 0; i < 90; i++) {
    const daysAgo = Math.floor(r() * 180) - 20; // some future-dated
    const due = new Date(now.getTime() - daysAgo * 86400000);
    const incoming = r() > 0.25;
    const rep = pick(reps);
    const amount = Math.round((incoming ? 8000 + r() * 160000 : 3000 + r() * 60000) / 100) * 100;
    const paid = daysAgo > 2 ? r() > 0.25 : false;

    let approval: Approval = "approved";
    if (daysAgo < 8) {
      const x = r();
      approval = x < 0.3 ? "pending_admin" : x < 0.45 ? "pending_ceo" : x < 0.5 ? "rejected" : "approved";
      if (approval === "pending_ceo" && amount <= SEED_SETTINGS.adminLimit) approval = "pending_admin";
    }

    out.push({
      id: `p-${i + 1}`,
      title: incoming ? `Invoice #INV-${1000 + i}` : `${pick(["Rent", "Utilities", "Travel", "Marketing"])} expense`,
      customer: incoming ? pick(CUSTOMERS) : pick(["Landlord", "Power Co.", "Airline", "Ad Agency"]),
      amount,
      type: incoming ? "incoming" : "outgoing",
      method: pick(SEED_SETTINGS.methods),
      category: incoming ? pick(["Sales", "Subscription", "Services"]) : pick(["Rent", "Utilities", "Travel", "Marketing"]),
      dueDate: due.toISOString().slice(0, 10),
      status: approval === "approved" && paid ? "paid" : "pending",
      approval,
      repId: rep.id,
      createdBy: rep.id,
      createdAt: new Date(due.getTime() - 5 * 86400000).toISOString(),
      rejectReason: approval === "rejected" ? "Missing receipt" : undefined,
    });
  }
  return out.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
}
