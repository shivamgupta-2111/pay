"use client";
import { useState } from "react";
import { Plus, Pencil, X, UserX, UserCheck } from "lucide-react";
import { useMe, useStore } from "@/store/useStore";
import { ROLE_LABEL } from "@/lib/permissions";
import type { User } from "@/lib/types";
import { fmtDate, money, monthKey, todayISO } from "@/lib/format";
import { Modal, Progress, initials } from "./ui";

/* ---------------- Users (Admin) ---------------- */
export function UsersView() {
  const { users, saveUser, settings } = useStore();
  const [editing, setEditing] = useState<Partial<User> | null>(null);

  return (
    <div className="card">
      <div className="card-title">
        <span>Team members</span>
        <button className="btn btn-primary" onClick={() => setEditing({ role: "rep", active: true, target: 300000, region: "North" })}><Plus size={16} /> Add rep</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>User</th><th>Role</th><th>Region</th><th>Monthly target</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
          <tbody>
            {users.map((u) => {
              const locked = u.role !== "rep"; // admin can manage reps only
              return (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div className="avatar">{initials(u.name)}</div>
                      <div><div style={{ fontWeight: 600 }}>{u.name}</div><div className="muted">{u.email}</div></div>
                    </div>
                  </td>
                  <td>{ROLE_LABEL[u.role]}</td>
                  <td>{u.region}</td>
                  <td>{u.role === "rep" ? money(u.target, settings.currency) : "—"}</td>
                  <td><span className={`badge ${u.active ? "b-green" : "b-grey"}`}>{u.active ? "Active" : "Inactive"}</span></td>
                  <td>
                    <div className="actions">
                      {locked ? <span className="muted">Protected</span> : (
                        <>
                          <button className="icon-btn" title="Edit" onClick={() => setEditing(u)}><Pencil size={16} /></button>
                          <button className="icon-btn" title={u.active ? "Deactivate" : "Activate"} onClick={() => saveUser({ ...u, active: !u.active })}>
                            {u.active ? <UserX size={16} /> : <UserCheck size={16} />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && <UserForm user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function UserForm({ user, onClose }: { user: Partial<User>; onClose: () => void }) {
  const saveUser = useStore((s) => s.saveUser);
  const [f, setF] = useState({ name: user.name ?? "", email: user.email ?? "", region: user.region ?? "", target: String(user.target ?? 0) });
  const valid = f.name.trim() && /\S+@\S+\.\S+/.test(f.email);
  return (
    <Modal title={user.id ? "Edit rep" : "Add rep"} onClose={onClose}>
      <div className="form-grid">
        <div className="field"><label>Full name</label><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="field"><label>Email</label><input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="field">
          <label>Region</label>
          <select className="select" value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })}>
            {["North", "South", "East", "West", "Central"].map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="field"><label>Monthly target</label><input className="input" type="number" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} /></div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => {
          saveUser({ id: user.id, name: f.name.trim(), email: f.email.trim(), region: f.region || "North", target: Number(f.target) || 0, role: "rep", active: user.active ?? true });
          onClose();
        }}>Save</button>
      </div>
    </Modal>
  );
}

/* ---------------- Settings (Admin: lists · CEO: limits) ---------------- */
export function SettingsView() {
  const me = useMe()!;
  const { settings, updateSettings } = useStore();
  const [limit, setLimit] = useState(String(settings.adminLimit));
  const [saved, setSaved] = useState(false);

  if (me.role === "ceo") {
    return (
      <div className="grid grid-eq">
        <div className="card">
          <div className="card-title">Approval limits</div>
          <p className="muted" style={{ marginBottom: 16 }}>
            Admin can approve payments up to this amount. Anything above is automatically forwarded to you for final approval.
          </p>
          <div className="field">
            <label>Admin approval limit ({settings.currency})</label>
            <input className="input" type="number" value={limit} onChange={(e) => { setLimit(e.target.value); setSaved(false); }} />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label>Currency</label>
            <select className="select" value={settings.currency} onChange={(e) => updateSettings({ currency: e.target.value })}>
              {["INR", "USD", "EUR", "GBP", "AED"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="modal-foot">
            {saved && <span className="muted" style={{ alignSelf: "center" }}>Saved ✓</span>}
            <button className="btn btn-primary" onClick={() => { updateSettings({ adminLimit: Number(limit) || 0 }); setSaved(true); }}>Save limit</button>
          </div>
        </div>
        <div className="card stat dark">
          <div className="label">Current rule</div>
          <div className="value">≤ {money(settings.adminLimit, settings.currency)}</div>
          <div className="hint" style={{ lineHeight: 1.7, marginTop: 12 }}>
            Rep submits → Admin reviews → amounts above the limit come to the CEO → rep is notified of the outcome.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-eq">
      <ListEditor title="Categories" items={settings.categories} onChange={(categories) => updateSettings({ categories })} />
      <ListEditor title="Payment methods" items={settings.methods} onChange={(methods) => updateSettings({ methods })} />
      <div className="card stat dark">
        <div className="label">Your approval limit (set by CEO)</div>
        <div className="value">{money(settings.adminLimit, settings.currency)}</div>
        <div className="hint">Payments above this are forwarded to the CEO.</div>
      </div>
    </div>
  );
}

function ListEditor({ title, items, onChange }: { title: string; items: string[]; onChange: (v: string[]) => void }) {
  const [v, setV] = useState("");
  const add = () => {
    const x = v.trim();
    if (x && !items.includes(x)) onChange([...items, x]);
    setV("");
  };
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input className="input" value={v} placeholder={`Add ${title.toLowerCase()}…`} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="btn btn-primary" onClick={add}><Plus size={16} /></button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {items.map((c) => (
          <span key={c} className="badge b-orange" style={{ paddingRight: 4 }}>
            {c}
            <button className="icon-btn" style={{ padding: 2 }} onClick={() => onChange(items.filter((x) => x !== c))}><X size={12} /></button>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Team & targets (CEO) ---------------- */
export function TeamView() {
  const { users, payments, settings, setTarget } = useStore();
  const thisMonth = monthKey(todayISO());
  const reps = users.filter((u) => u.role === "rep");

  const rows = reps
    .map((r) => {
      const mine = payments.filter((p) => p.repId === r.id && p.type === "incoming" && p.approval === "approved");
      const collected = mine.filter((p) => p.status === "paid" && monthKey(p.dueDate) === thisMonth).reduce((a, p) => a + p.amount, 0);
      const outstanding = mine.filter((p) => p.status !== "paid").reduce((a, p) => a + p.amount, 0);
      return { r, collected, outstanding, pct: r.target ? Math.round((collected / r.target) * 100) : 0 };
    })
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="card">
      <div className="card-title"><span>Leaderboard & monthly targets</span><span className="muted">Edit a target and press Enter</span></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Rep</th><th>Region</th><th>Collected (month)</th><th style={{ width: 220 }}>Progress</th><th>Outstanding</th><th>Target</th></tr></thead>
          <tbody>
            {rows.map(({ r, collected, outstanding, pct }, i) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 800, color: i === 0 ? "var(--orange-brand)" : undefined }}>{i + 1}</td>
                <td><div style={{ fontWeight: 600 }}>{r.name}</div>{!r.active && <span className="muted">Inactive</span>}</td>
                <td>{r.region}</td>
                <td style={{ fontWeight: 700 }}>{money(collected, settings.currency)}</td>
                <td><Progress value={pct} /><div className="muted" style={{ marginTop: 4 }}>{pct}%</div></td>
                <td>{money(outstanding, settings.currency)}</td>
                <td>
                  <input
                    className="input" type="number" defaultValue={r.target} style={{ width: 130 }}
                    onKeyDown={(e) => e.key === "Enter" && setTarget(r.id, Number((e.target as HTMLInputElement).value) || 0)}
                    onBlur={(e) => Number(e.target.value) !== r.target && setTarget(r.id, Number(e.target.value) || 0)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Audit log (CEO) ---------------- */
export function AuditView() {
  const audit = useStore((s) => s.audit);
  return (
    <div className="card">
      <div className="card-title"><span>Audit log</span><span className="muted">{audit.length} events</span></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>When</th><th>User</th><th>Role</th><th>Action</th><th>Detail</th></tr></thead>
          <tbody>
            {audit.map((a) => (
              <tr key={a.id}>
                <td className="muted">{fmtDate(a.at)} {new Date(a.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</td>
                <td style={{ fontWeight: 600 }}>{a.user}</td>
                <td>{ROLE_LABEL[a.role]}</td>
                <td><span className="badge b-orange">{a.action}</span></td>
                <td className="muted">{a.detail}</td>
              </tr>
            ))}
            {!audit.length && <tr><td colSpan={5} className="empty">No activity yet. Actions taken in any portal appear here.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Customers (Rep) ---------------- */
export function CustomersView() {
  const me = useMe()!;
  const { payments, settings } = useStore();
  const mine = payments.filter((p) => p.repId === me.id && p.type === "incoming");
  const map = new Map<string, { total: number; paid: number; due: number; last: string; count: number }>();
  mine.forEach((p) => {
    const c = map.get(p.customer) ?? { total: 0, paid: 0, due: 0, last: "", count: 0 };
    c.total += p.amount;
    c.count++;
    if (p.status === "paid") c.paid += p.amount;
    else if (p.approval === "approved") c.due += p.amount;
    if (p.dueDate > c.last) c.last = p.dueDate;
    map.set(p.customer, c);
  });
  const rows = [...map.entries()].sort((a, b) => b[1].due - a[1].due);

  return (
    <div className="card">
      <div className="card-title">My customers</div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Customer</th><th>Invoices</th><th>Total billed</th><th>Collected</th><th>Outstanding</th><th>Last activity</th></tr></thead>
          <tbody>
            {rows.map(([name, c]) => (
              <tr key={name}>
                <td style={{ fontWeight: 600 }}>{name}</td>
                <td>{c.count}</td>
                <td>{money(c.total, settings.currency)}</td>
                <td className="amount-in">{money(c.paid, settings.currency)}</td>
                <td style={{ fontWeight: 700, color: c.due ? "var(--orange-dark)" : undefined }}>{money(c.due, settings.currency)}</td>
                <td className="muted">{c.last ? fmtDate(c.last) : "—"}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="empty">No customers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
