export type Role = "ceo" | "admin" | "rep";

/** Where a payment is in the approval workflow */
export type Approval = "pending_admin" | "pending_ceo" | "approved" | "rejected";

/** Stored payment status. "overdue" / "partial" are computed. */
export type PayStatus = "paid" | "pending";

export type Cycle = "monthly" | "quarterly" | "half_yearly" | "yearly";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  region: string;
  target: number; // monthly collection target (reps)
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  cycle: Cycle;
  taxRate: number; // %
  active: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string; // company / customer name
  contact: string; // contact person
  phone: string;
  email: string;
  city: string;
  repId: string;
  notes?: string;
  createdAt: string;
}

export type SubStatus = "active" | "paused" | "cancelled";

export interface Subscription {
  id: string;
  customerId: string;
  productId: string;
  price: number;
  cycle: Cycle;
  startDate: string;
  nextDueDate: string; // next invoice date
  status: SubStatus;
  repId: string;
  cancelReason?: string;
  createdAt: string;
}

export interface Receipt {
  id: string;
  amount: number;
  method: string;
  reference?: string;
  date: string;
  by: string; // user name
  verified: boolean; // rep receipts need admin verification
}

export type Channel = "whatsapp" | "sms" | "email" | "call" | "copied";

export interface ReminderLog {
  at: string; // ISO time
  date: string; // local yyyy-mm-dd
  channel: Channel;
  kind: "upcoming" | "due" | "overdue";
  by: string;
}

export interface FollowUp {
  at: string;
  note: string;
  by: string;
  promiseDate?: string;
}

export interface Payment {
  id: string;
  title: string;
  invoiceNo?: string;
  customer: string;
  customerId?: string;
  subscriptionId?: string;
  productId?: string;
  period?: string;
  amount: number;
  paidAmount: number;
  type: "incoming" | "outgoing";
  method: string;
  category: string;
  dueDate: string; // yyyy-mm-dd
  status: PayStatus;
  approval: Approval;
  repId: string;
  createdBy: string;
  createdAt: string;
  notes?: string;
  rejectReason?: string;
  deleteRequested?: boolean;
  receipts: Receipt[];
  reminders: ReminderLog[];
  followUps: FollowUp[];
  snoozedUntil?: string;
  promiseDate?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  user: string;
  role: Role;
  action: string;
  detail: string;
}

export type TemplateKind = "upcoming" | "due" | "overdue";

export interface Settings {
  adminLimit: number;
  currency: string;
  categories: string[];
  methods: string[];
  companyName: string;
  upiId: string;
  reminderDays: number[]; // remind N days before due, e.g. [7,3,1]
  overdueEvery: number; // after due date, remind every N days
  lookaheadDays: number; // create invoices this many days before due
  templates: Record<TemplateKind, string>;
}
