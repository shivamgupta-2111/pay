import type { Customer, Payment, Product, Settings, Subscription, User, Cycle } from "./types";
import { addDays, daysUntil, todayISO, uid } from "./format";
import { generateInvoices } from "./billing";

export const SEED_USERS: User[] = [
  { id: "u-ceo", name: "Vikram Mehta", email: "ceo@company.com", role: "ceo", region: "HQ", target: 0, active: true },
  { id: "u-admin", name: "Priya Sharma", email: "admin@company.com", role: "admin", region: "HQ", target: 0, active: true },
  { id: "u-rep1", name: "Rahul Verma", email: "rahul@company.com", role: "rep", region: "North", target: 150000, active: true },
  { id: "u-rep2", name: "Ananya Iyer", email: "ananya@company.com", role: "rep", region: "South", target: 150000, active: true },
  { id: "u-rep3", name: "Karan Singh", email: "karan@company.com", role: "rep", region: "West", target: 120000, active: true },
  { id: "u-rep4", name: "Sneha Patel", email: "sneha@company.com", role: "rep", region: "East", target: 120000, active: true },
];

export const SEED_SETTINGS: Settings = {
  adminLimit: 100000,
  currency: "INR",
  categories: ["Subscription", "One-time Sale", "Services", "Rent", "Salary", "Utilities", "Travel", "Marketing"],
  methods: ["UPI", "Bank Transfer", "Card", "Cash", "Cheque"],
  companyName: "PayTrack Solutions",
  upiId: "paytrack@okicici",
  reminderDays: [7, 3, 1],
  overdueEvery: 2,
  lookaheadDays: 7,
  templates: {
    upcoming:
      "Hi {customer}, this is a friendly reminder that your {product} subscription payment of {amount} for {period} is due on {due_date} ({days} days left).\n\nPay via UPI: {upi}\nInvoice: {invoice}\n\nThank you!\n– {company}",
    due:
      "Hi {customer}, your {product} payment of {amount} ({invoice}) is due TODAY.\n\nPlease pay via UPI: {upi} to keep your subscription active.\n\n– {company}",
    overdue:
      "Hi {customer}, your {product} payment of {amount} ({invoice}) was due on {due_date} and is now {days} days overdue.\n\nPlease clear it at the earliest via UPI: {upi}. If already paid, kindly share the reference.\n\n– {company}",
  },
};

const iso = () => new Date().toISOString();

export const SEED_PRODUCTS: Product[] = [
  { id: "pr-1", name: "Starter Plan", sku: "PLN-STR", description: "Basic package for small businesses", price: 2999, cycle: "monthly", taxRate: 18, active: true, createdAt: iso() },
  { id: "pr-2", name: "Growth Plan", sku: "PLN-GRW", description: "For growing teams, priority support", price: 7999, cycle: "monthly", taxRate: 18, active: true, createdAt: iso() },
  { id: "pr-3", name: "Business Plan", sku: "PLN-BIZ", description: "Quarterly billing, all features", price: 44999, cycle: "quarterly", taxRate: 18, active: true, createdAt: iso() },
  { id: "pr-4", name: "Enterprise Suite", sku: "PLN-ENT", description: "Annual contract with dedicated manager", price: 249999, cycle: "yearly", taxRate: 18, active: true, createdAt: iso() },
  { id: "pr-5", name: "Annual Maintenance (AMC)", sku: "SRV-AMC", description: "Yearly maintenance & service visits", price: 24999, cycle: "yearly", taxRate: 18, active: true, createdAt: iso() },
  { id: "pr-6", name: "Premium Support", sku: "SRV-SUP", description: "24×7 phone & chat support add-on", price: 4999, cycle: "monthly", taxRate: 18, active: true, createdAt: iso() },
];

const CUST: [string, string, string, string][] = [
  ["Acme Traders", "Rohit Gupta", "Delhi", "u-rep1"],
  ["Blue Ocean Pvt Ltd", "Meera Nair", "Kochi", "u-rep2"],
  ["Sunrise Retail", "Amit Joshi", "Jaipur", "u-rep1"],
  ["Nova Foods", "Divya Rao", "Bengaluru", "u-rep2"],
  ["Metro Pharma", "Sanjay Kulkarni", "Pune", "u-rep3"],
  ["Greenleaf Agro", "Pooja Das", "Kolkata", "u-rep4"],
  ["Pixel Studios", "Arjun Kapoor", "Mumbai", "u-rep3"],
  ["Urban Mart", "Neha Bansal", "Chandigarh", "u-rep1"],
  ["Zenith Motors", "Farhan Sheikh", "Ahmedabad", "u-rep3"],
  ["Orbit Logistics", "Lakshmi Menon", "Chennai", "u-rep2"],
  ["Lotus Clinics", "Ritu Saxena", "Lucknow", "u-rep1"],
  ["Coastal Hotels", "Ankit Bose", "Bhubaneswar", "u-rep4"],
];

function rng(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export function seedData() {
  const r = rng(7);
  const today = todayISO();
  const customers: Customer[] = CUST.map(([name, contact, city, repId], i) => ({
    id: `c-${i + 1}`, name, contact, city, repId,
    phone: `98${String(10000000 + Math.floor(r() * 89999999))}`,
    email: `${contact.split(" ")[0].toLowerCase()}@${name.split(" ")[0].toLowerCase()}.in`,
    createdAt: iso(),
  }));

  // [customerIdx, productIdx, monthsAgoStarted, dayOfMonth]
  const plan: [number, number, number, number][] = [
    [0, 1, 7, 5], [0, 5, 5, 5], [1, 2, 8, 12], [2, 0, 6, 1], [3, 1, 9, 20], [3, 4, 10, 15],
    [4, 3, 11, 3], [5, 0, 4, 25], [6, 1, 7, 10], [6, 5, 3, 10], [7, 0, 5, 28], [8, 2, 5, 22],
    [9, 1, 8, 8], [10, 0, 2, 17], [11, 4, 6, 9], [11, 5, 6, 9], [1, 0, 3, 14],
  ];
  const now = new Date();
  let subscriptions: Subscription[] = plan.map(([ci, pi, ago, day], i) => {
    const p = SEED_PRODUCTS[pi];
    const start = new Date(now.getFullYear(), now.getMonth() - ago, day);
    const startISO = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    return {
      id: `s-${i + 1}`, customerId: customers[ci].id, productId: p.id, price: p.price, cycle: p.cycle as Cycle,
      startDate: startISO, nextDueDate: startISO, status: "active", repId: customers[ci].repId, createdAt: iso(),
    };
  });
  // a paused & a cancelled one for realism
  subscriptions[16] = { ...subscriptions[16], status: "cancelled", cancelReason: "Switched to competitor" };

  const gen = generateInvoices(subscriptions, customers, SEED_PRODUCTS, 1001, addDays(today, SEED_SETTINGS.lookaheadDays));
  subscriptions = gen.subs;
  subscriptions[13] = { ...subscriptions[13], status: "paused" };

  const payments: Payment[] = gen.payments.map((p) => {
    const d = daysUntil(p.dueDate);
    const x = r();
    const full = d < -40 ? x < 0.95 : d < 0 ? x < 0.55 : x < 0.1;
    const partial = !full && d < 0 && x < 0.65;
    const paidAmount = full ? p.amount : partial ? Math.round(p.amount * 0.4) : 0;
    const out: Payment = {
      ...p,
      paidAmount,
      status: full ? "paid" : "pending",
      receipts: paidAmount
        ? [{ id: uid(), amount: paidAmount, method: ["UPI", "Bank Transfer", "Card"][Math.floor(r() * 3)], reference: `UTR${Math.floor(r() * 1e9)}`, date: addDays(p.dueDate, Math.floor(r() * 6)), by: "System", verified: true }]
        : [],
    };
    if (!full && d < 0) {
      out.reminders = [{ at: new Date(Date.now() - 3 * 86400000).toISOString(), date: addDays(today, -3), channel: "whatsapp", kind: "overdue", by: "Rep" }];
      if (r() < 0.3) {
        out.promiseDate = addDays(today, 2);
        out.followUps = [{ at: iso(), note: "Called – promised to pay by end of week", by: "Rep", promiseDate: out.promiseDate }];
      }
    }
    return out;
  });

  // a rep-recorded collection waiting for verification
  const pendingVerify = payments.find((p) => p.status !== "paid" && daysUntil(p.dueDate) < 0 && p.paidAmount === 0);
  if (pendingVerify) {
    pendingVerify.paidAmount = pendingVerify.amount;
    pendingVerify.status = "paid";
    pendingVerify.approval = "pending_admin";
    pendingVerify.receipts = [{ id: uid(), amount: pendingVerify.amount, method: "Cash", date: today, by: "Rep", verified: false }];
  }

  // business expenses (outgoing)
  for (let i = 0; i < 24; i++) {
    const due = addDays(today, -Math.floor(r() * 175));
    const cat = ["Rent", "Utilities", "Travel", "Marketing", "Salary"][Math.floor(r() * 5)];
    const amount = Math.round((cat === "Salary" ? 60000 + r() * 40000 : 3000 + r() * 30000) / 100) * 100;
    payments.push({
      id: uid(), title: `${cat} expense`, customer: { Rent: "Landlord", Utilities: "Power Co.", Travel: "Airline", Marketing: "Ad Agency", Salary: "Payroll" }[cat]!,
      amount, paidAmount: amount, type: "outgoing", method: "Bank Transfer", category: cat, dueDate: due, status: "paid",
      approval: "approved", repId: "u-rep1", createdBy: "u-admin", createdAt: iso(), receipts: [], reminders: [], followUps: [],
    });
  }

  // manual entries from reps awaiting approval
  const manual: [string, string, number, string][] = [
    ["One-time setup fee", "c-3", 15000, "u-rep1"],
    ["Hardware sale", "c-5", 135000, "u-rep3"],
    ["Training workshop", "c-4", 22000, "u-rep2"],
  ];
  manual.forEach(([title, cid, amount, rep], i) => {
    const c = customers.find((x) => x.id === cid)!;
    payments.push({
      id: uid(), title, customer: c.name, customerId: cid, amount, paidAmount: 0, type: "incoming", method: "Bank Transfer",
      category: "One-time Sale", dueDate: addDays(today, 5 + i), status: "pending", approval: i === 1 ? "pending_ceo" : "pending_admin",
      repId: rep, createdBy: rep, createdAt: iso(), receipts: [], reminders: [], followUps: [],
    });
  });

  payments.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  return { customers, subscriptions, payments, products: SEED_PRODUCTS, invoiceCounter: gen.counter };
}
