"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AuditEntry, Channel, Customer, Payment, Product, Receipt, Settings, SubStatus, Subscription, User,
} from "@/lib/types";
import { SEED_SETTINGS, SEED_USERS, seedData } from "@/lib/mockData";
import { addDays, todayISO, uid } from "@/lib/format";
import { addCycle, generateInvoices, makeInvoice, templateKind } from "@/lib/billing";

type NewPayment = Omit<Payment, "id" | "createdAt" | "createdBy" | "approval" | "paidAmount" | "receipts" | "reminders" | "followUps">;
type Upsert<T extends { id: string }> = Omit<T, "id" | "createdAt"> & { id?: string };

interface State {
  currentUserId: string | null;
  users: User[];
  products: Product[];
  customers: Customer[];
  subscriptions: Subscription[];
  payments: Payment[];
  audit: AuditEntry[];
  settings: Settings;
  invoiceCounter: number;

  login: (userId: string) => void;
  logout: () => void;

  // payments
  addPayment: (p: NewPayment) => void;
  updatePayment: (id: string, patch: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  requestDelete: (id: string) => void;
  markPaid: (id: string) => void;
  recordPayment: (id: string, r: Omit<Receipt, "id" | "by" | "verified">) => void;
  approve: (id: string) => void;
  reject: (id: string, reason: string) => void;

  // reminders
  logReminder: (ids: string[], channel: Channel) => void;
  snooze: (ids: string[], days: number) => void;
  unsnooze: (id: string) => void;
  addFollowUp: (id: string, note: string, promiseDate?: string) => void;

  // catalogue
  saveProduct: (p: Upsert<Product>) => void;
  deleteProduct: (id: string) => void;
  saveCustomer: (c: Upsert<Customer>) => void;
  addSubscription: (s: Omit<Subscription, "id" | "createdAt" | "nextDueDate" | "status">) => void;
  updateSubscription: (id: string, patch: Partial<Subscription>) => void;
  setSubStatus: (id: string, status: SubStatus, reason?: string) => void;
  billNow: (id: string) => void;
  runBilling: () => number;

  // admin
  saveUser: (u: Omit<User, "id"> & { id?: string }) => void;
  setTarget: (userId: string, target: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetDemo: () => void;
}

const initial = () => ({ users: SEED_USERS, audit: [] as AuditEntry[], settings: SEED_SETTINGS, ...seedData() });

const sumReceipts = (rs: Receipt[]) => rs.reduce((a, r) => a + r.amount, 0);

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const me = () => get().users.find((u) => u.id === get().currentUserId);
      const log = (action: string, detail: string) => {
        const u = me();
        if (!u) return;
        const entry: AuditEntry = { id: uid(), at: new Date().toISOString(), user: u.name, role: u.role, action, detail };
        set((s) => ({ audit: [entry, ...s.audit].slice(0, 800) }));
      };
      const patchPayments = (ids: string[], fn: (p: Payment) => Payment) =>
        set((s) => ({ payments: s.payments.map((p) => (ids.includes(p.id) ? fn(p) : p)) }));
      const pName = (id: string) => get().payments.find((p) => p.id === id)?.invoiceNo ?? get().payments.find((p) => p.id === id)?.title ?? id;

      return {
        currentUserId: null,
        ...initial(),

        login: (userId) => {
          set({ currentUserId: userId });
          log("Login", "Signed in");
        },
        logout: () => {
          log("Logout", "Signed out");
          set({ currentUserId: null });
        },

        /* ---------- payments ---------- */
        addPayment: (p) => {
          const u = me();
          if (!u) return;
          const { adminLimit } = get().settings;
          const approval = u.role === "ceo" ? "approved" : u.role === "admin" ? (p.amount > adminLimit ? "pending_ceo" : "approved") : "pending_admin";
          const payment: Payment = {
            ...p, id: uid(), createdAt: new Date().toISOString(), createdBy: u.id, approval,
            repId: u.role === "rep" ? u.id : p.repId,
            paidAmount: p.status === "paid" ? p.amount : 0, receipts: [], reminders: [], followUps: [],
          };
          set((s) => ({ payments: [payment, ...s.payments] }));
          log("Create payment", `${payment.title} – ${payment.amount}`);
        },
        updatePayment: (id, patch) => {
          patchPayments([id], (p) => ({ ...p, ...patch }));
          log("Edit payment", pName(id));
        },
        deletePayment: (id) => {
          const n = pName(id);
          set((s) => ({ payments: s.payments.filter((x) => x.id !== id) }));
          log("Delete payment", n);
        },
        requestDelete: (id) => {
          patchPayments([id], (p) => ({ ...p, deleteRequested: true }));
          log("Request delete", pName(id));
        },
        markPaid: (id) => {
          const p = get().payments.find((x) => x.id === id);
          if (p) get().recordPayment(id, { amount: p.amount - p.paidAmount, method: p.method, date: todayISO() });
        },
        recordPayment: (id, r) => {
          const u = me();
          if (!u) return;
          const verified = u.role !== "rep";
          patchPayments([id], (p) => {
            const receipts = [...p.receipts, { ...r, id: uid(), by: u.name, verified }];
            const paid = sumReceipts(receipts);
            return {
              ...p, receipts, paidAmount: paid, status: paid >= p.amount ? "paid" : "pending",
              approval: verified ? p.approval : "pending_admin", snoozedUntil: undefined,
            };
          });
          log("Record payment", `${pName(id)}: ${r.amount} via ${r.method}${verified ? "" : " (needs verification)"}`);
        },
        approve: (id) => {
          const u = me();
          const p = get().payments.find((x) => x.id === id);
          if (!u || !p) return;
          if (u.role === "admin" && p.amount > get().settings.adminLimit) {
            patchPayments([id], (x) => ({ ...x, approval: "pending_ceo" }));
            log("Escalate to CEO", `${pName(id)} exceeds admin limit`);
            return;
          }
          patchPayments([id], (x) => ({ ...x, approval: "approved", rejectReason: undefined, receipts: x.receipts.map((r) => ({ ...r, verified: true })) }));
          log("Approve", pName(id));
        },
        reject: (id, reason) => {
          patchPayments([id], (p) => {
            // a collection on an existing invoice: drop the unverified receipts, keep the invoice open
            if (p.subscriptionId || p.receipts.some((r) => !r.verified)) {
              const receipts = p.receipts.filter((r) => r.verified);
              const paid = sumReceipts(receipts);
              return { ...p, receipts, paidAmount: paid, status: paid >= p.amount ? "paid" : "pending", approval: "approved", rejectReason: `Collection rejected: ${reason}` };
            }
            return { ...p, approval: "rejected", rejectReason: reason };
          });
          log("Reject", `${pName(id)}: ${reason}`);
        },

        /* ---------- reminders ---------- */
        logReminder: (ids, channel) => {
          const u = me();
          if (!u) return;
          const now = new Date();
          patchPayments(ids, (p) => ({
            ...p,
            reminders: [...p.reminders, { at: now.toISOString(), date: todayISO(), channel, kind: templateKind(p), by: u.name }],
          }));
          log("Reminder sent", `${ids.length > 1 ? `${ids.length} invoices` : pName(ids[0])} via ${channel}`);
        },
        snooze: (ids, days) => {
          patchPayments(ids, (p) => ({ ...p, snoozedUntil: addDays(todayISO(), days) }));
          log("Snooze", `${ids.length} invoice(s) for ${days} day(s)`);
        },
        unsnooze: (id) => patchPayments([id], (p) => ({ ...p, snoozedUntil: undefined })),
        addFollowUp: (id, note, promiseDate) => {
          const u = me();
          if (!u) return;
          patchPayments([id], (p) => ({
            ...p,
            followUps: [...p.followUps, { at: new Date().toISOString(), note, by: u.name, promiseDate }],
            promiseDate: promiseDate || p.promiseDate,
          }));
          log("Follow-up", `${pName(id)}: ${note}${promiseDate ? ` (promised ${promiseDate})` : ""}`);
        },

        /* ---------- products / customers / subscriptions ---------- */
        saveProduct: (p) => {
          if (p.id) set((s) => ({ products: s.products.map((x) => (x.id === p.id ? { ...x, ...p } as Product : x)) }));
          else set((s) => ({ products: [...s.products, { ...p, id: uid(), createdAt: new Date().toISOString() } as Product] }));
          log(p.id ? "Edit product" : "Add product", p.name);
        },
        deleteProduct: (id) => {
          const n = get().products.find((p) => p.id === id)?.name ?? id;
          set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
          log("Delete product", n);
        },
        saveCustomer: (c) => {
          const u = me();
          if (c.id) {
            set((s) => ({ customers: s.customers.map((x) => (x.id === c.id ? { ...x, ...c } as Customer : x)) }));
            // keep invoice owner / name in sync
            set((s) => ({
              payments: s.payments.map((p) => (p.customerId === c.id ? { ...p, customer: c.name, repId: p.subscriptionId ? c.repId : p.repId } : p)),
              subscriptions: s.subscriptions.map((x) => (x.customerId === c.id ? { ...x, repId: c.repId } : x)),
            }));
          } else {
            const repId = u?.role === "rep" ? u.id : c.repId;
            set((s) => ({ customers: [...s.customers, { ...c, repId, id: uid(), createdAt: new Date().toISOString() } as Customer] }));
          }
          log(c.id ? "Edit customer" : "Add customer", c.name);
        },
        addSubscription: (sub) => {
          const u = me();
          const s: Subscription = {
            ...sub, id: uid(), createdAt: new Date().toISOString(), status: "active", nextDueDate: sub.startDate,
            repId: u?.role === "rep" ? u.id : sub.repId,
          };
          set((st) => ({ subscriptions: [s, ...st.subscriptions] }));
          log("New subscription", `${get().customers.find((c) => c.id === s.customerId)?.name} – ${get().products.find((p) => p.id === s.productId)?.name}`);
          get().runBilling();
        },
        updateSubscription: (id, patch) => {
          set((s) => ({ subscriptions: s.subscriptions.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
          log("Edit subscription", id);
        },
        setSubStatus: (id, status, reason) => {
          const today = todayISO();
          set((s) => ({
            subscriptions: s.subscriptions.map((x) => {
              if (x.id !== id) return x;
              // when resuming, don't back-bill the paused period
              let next = x.nextDueDate;
              if (status === "active") while (next < today) next = addCycle(next, x.cycle);
              return { ...x, status, cancelReason: status === "cancelled" ? reason : x.cancelReason, nextDueDate: next };
            }),
            // cancelling voids future unpaid invoices
            payments:
              status === "cancelled"
                ? s.payments.filter((p) => !(p.subscriptionId === id && p.paidAmount === 0 && p.dueDate > today))
                : s.payments,
          }));
          log(status === "active" ? "Resume subscription" : status === "paused" ? "Pause subscription" : "Cancel subscription", `${id}${reason ? `: ${reason}` : ""}`);
          if (status === "active") get().runBilling();
        },
        billNow: (id) => {
          const st = get();
          const s = st.subscriptions.find((x) => x.id === id);
          if (!s) return;
          const inv = makeInvoice(s, st.customers.find((c) => c.id === s.customerId), st.products.find((p) => p.id === s.productId), s.nextDueDate, st.invoiceCounter);
          set((x) => ({
            payments: [inv, ...x.payments],
            invoiceCounter: x.invoiceCounter + 1,
            subscriptions: x.subscriptions.map((y) => (y.id === id ? { ...y, nextDueDate: addCycle(y.nextDueDate, y.cycle) } : y)),
          }));
          log("Bill now", `${inv.invoiceNo} for ${inv.customer}`);
        },
        runBilling: () => {
          const st = get();
          const g = generateInvoices(st.subscriptions, st.customers, st.products, st.invoiceCounter, addDays(todayISO(), st.settings.lookaheadDays));
          if (!g.payments.length) return 0;
          set((s) => ({ payments: [...g.payments, ...s.payments], subscriptions: g.subs, invoiceCounter: g.counter }));
          log("Auto-billing", `Generated ${g.payments.length} invoice(s)`);
          return g.payments.length;
        },

        /* ---------- admin ---------- */
        saveUser: (u) => {
          if (u.id) set((s) => ({ users: s.users.map((x) => (x.id === u.id ? ({ ...x, ...u } as User) : x)) }));
          else set((s) => ({ users: [...s.users, { ...u, id: uid() } as User] }));
          log(u.id ? "Edit user" : "Add user", u.name);
        },
        setTarget: (userId, target) => {
          set((s) => ({ users: s.users.map((x) => (x.id === userId ? { ...x, target } : x)) }));
          log("Set target", `${userId} → ${target}`);
        },
        updateSettings: (patch) => {
          set((s) => ({ settings: { ...s.settings, ...patch } }));
          log("Update settings", Object.keys(patch).join(", "));
        },
        resetDemo: () => set({ ...initial(), currentUserId: get().currentUserId }),
      };
    },
    { name: "paytrack-v2" }
  )
);

export const useMe = () => useStore((s) => s.users.find((u) => u.id === s.currentUserId));
