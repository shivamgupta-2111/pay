export type Role = "ceo" | "admin" | "rep";

/** Where a payment is in the approval workflow */
export type Approval = "pending_admin" | "pending_ceo" | "approved" | "rejected";

/** Stored payment status. "overdue" is computed from dueDate. */
export type PayStatus = "paid" | "pending";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  region: string;
  target: number; // monthly collection target (reps)
  active: boolean;
}

export interface Payment {
  id: string;
  title: string;
  customer: string;
  amount: number;
  type: "incoming" | "outgoing";
  method: string;
  category: string;
  dueDate: string; // yyyy-mm-dd
  status: PayStatus;
  approval: Approval;
  repId: string; // owner rep
  createdBy: string; // user id
  createdAt: string; // ISO
  notes?: string;
  rejectReason?: string;
  deleteRequested?: boolean;
}

export interface AuditEntry {
  id: string;
  at: string;
  user: string;
  role: Role;
  action: string;
  detail: string;
}

export interface Settings {
  adminLimit: number; // admin can approve up to this amount; above goes to CEO
  currency: string;
  categories: string[];
  methods: string[];
}
