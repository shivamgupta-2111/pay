"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Approval } from "@/lib/types";
import type { EffectiveStatus } from "@/lib/format";
import { useMe } from "@/store/useStore";
import { can, type Permission } from "@/lib/permissions";

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

/** Renders children only if the current user has the permission */
export function Can({ perm, children }: { perm: Permission; children: React.ReactNode }) {
  const me = useMe();
  return can(me?.role, perm) ? <>{children}</> : null;
}

export function StatCard({
  label, value, hint, icon, dark,
}: { label: string; value: string; hint?: string; icon?: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`card stat ${dark ? "dark" : ""}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint && <div className="hint">{hint}</div>}
      {icon && <div className="icon">{icon}</div>}
    </div>
  );
}

const STATUS_CLASS: Record<EffectiveStatus, string> = { paid: "b-green", pending: "b-orange", overdue: "b-red" };
export function StatusBadge({ s }: { s: EffectiveStatus }) {
  return <span className={`badge ${STATUS_CLASS[s]}`}>{s[0].toUpperCase() + s.slice(1)}</span>;
}

const APPROVAL: Record<Approval, [string, string]> = {
  pending_admin: ["Awaiting Admin", "b-blue"],
  pending_ceo: ["Awaiting CEO", "b-orange"],
  approved: ["Approved", "b-green"],
  rejected: ["Rejected", "b-red"],
};
export function ApprovalBadge({ a }: { a: Approval }) {
  const [label, cls] = APPROVAL[a];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return <div className="progress"><div style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export const initials = (name: string) => name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
