"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuditEntry, Payment, Settings, User } from "@/lib/types";
import { SEED_SETTINGS, SEED_USERS, seedPayments } from "@/lib/mockData";
import { uid } from "@/lib/format";

type NewPayment = Omit<Payment, "id" | "createdAt" | "createdBy" | "approval">;

interface State {
  currentUserId: string | null;
  users: User[];
  payments: Payment[];
  audit: AuditEntry[];
  settings: Settings;

  login: (userId: string) => void;
  logout: () => void;

  addPayment: (p: NewPayment) => void;
  updatePayment: (id: string, patch: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  requestDelete: (id: string) => void;
  markPaid: (id: string) => void;
  approve: (id: string) => void;
  reject: (id: string, reason: string) => void;

  saveUser: (u: Omit<User, "id"> & { id?: string }) => void;
  setTarget: (userId: string, target: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetDemo: () => void;
}

const initial = () => ({
  users: SEED_USERS,
  payments: seedPayments(),
  audit: [] as AuditEntry[],
  settings: SEED_SETTINGS,
});

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const me = () => get().users.find((u) => u.id === get().currentUserId);
      const log = (action: string, detail: string) => {
        const u = me();
        if (!u) return;
        const entry: AuditEntry = { id: uid(), at: new Date().toISOString(), user: u.name, role: u.role, action, detail };
        set((s) => ({ audit: [entry, ...s.audit].slice(0, 500) }));
      };

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

        addPayment: (p) => {
          const u = me();
          if (!u) return;
          const { adminLimit } = get().settings;
          // Approval routing based on who creates it
          const approval =
            u.role === "ceo" ? "approved" : u.role === "admin" ? (p.amount > adminLimit ? "pending_ceo" : "approved") : "pending_admin";
          const payment: Payment = {
            ...p,
            id: uid(),
            createdAt: new Date().toISOString(),
            createdBy: u.id,
            approval,
            repId: u.role === "rep" ? u.id : p.repId,
          };
          set((s) => ({ payments: [payment, ...s.payments] }));
          log("Create payment", `${payment.title} – ${payment.amount}`);
        },

        updatePayment: (id, patch) => {
          set((s) => ({ payments: s.payments.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
          log("Edit payment", id);
        },

        deletePayment: (id) => {
          const p = get().payments.find((x) => x.id === id);
          set((s) => ({ payments: s.payments.filter((x) => x.id !== id) }));
          log("Delete payment", p?.title ?? id);
        },

        requestDelete: (id) => {
          set((s) => ({ payments: s.payments.map((p) => (p.id === id ? { ...p, deleteRequested: true } : p)) }));
          log("Request delete", id);
        },

        markPaid: (id) => {
          set((s) => ({ payments: s.payments.map((p) => (p.id === id ? { ...p, status: "paid" } : p)) }));
          log("Mark paid", id);
        },

        approve: (id) => {
          const u = me();
          const p = get().payments.find((x) => x.id === id);
          if (!u || !p) return;
          const { adminLimit } = get().settings;
          if (u.role === "admin" && p.amount > adminLimit) {
            set((s) => ({ payments: s.payments.map((x) => (x.id === id ? { ...x, approval: "pending_ceo" } : x)) }));
            log("Escalate to CEO", `${p.title} exceeds admin limit`);
            return;
          }
          set((s) => ({ payments: s.payments.map((x) => (x.id === id ? { ...x, approval: "approved", rejectReason: undefined } : x)) }));
          log("Approve payment", p.title);
        },

        reject: (id, reason) => {
          set((s) => ({ payments: s.payments.map((x) => (x.id === id ? { ...x, approval: "rejected", rejectReason: reason } : x)) }));
          log("Reject payment", `${id}: ${reason}`);
        },

        saveUser: (u) => {
          if (u.id) {
            set((s) => ({ users: s.users.map((x) => (x.id === u.id ? ({ ...x, ...u } as User) : x)) }));
            log("Edit user", u.name);
          } else {
            set((s) => ({ users: [...s.users, { ...u, id: uid() } as User] }));
            log("Add user", u.name);
          }
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
    { name: "payment-tracker-v1" }
  )
);

export const useMe = () => useStore((s) => s.users.find((u) => u.id === s.currentUserId));
