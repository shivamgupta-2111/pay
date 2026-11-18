"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Crown, ShieldCheck, Briefcase, Wallet, ChevronRight } from "lucide-react";
import { useStore } from "@/store/useStore";
import type { Role } from "@/lib/types";
import { useHydrated } from "@/components/ui";

const ROLES: { role: Role; title: string; desc: string; icon: React.ReactNode }[] = [
  { role: "ceo", title: "CEO", desc: "Company overview, final approvals, targets & limits", icon: <Crown size={20} /> },
  { role: "admin", title: "Admin", desc: "Manage users, payments, approvals & settings", icon: <ShieldCheck size={20} /> },
  { role: "rep", title: "Sales Rep", desc: "Record collections, track your target & customers", icon: <Briefcase size={20} /> },
];

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { users, login } = useStore();
  const reps = users.filter((u) => u.role === "rep" && u.active);
  const [repId, setRepId] = useState(reps[0]?.id ?? "");

  const enter = (role: Role) => {
    const user = role === "rep" ? users.find((u) => u.id === repId) : users.find((u) => u.role === role);
    if (!user) return;
    login(user.id);
    router.push(`/${role}`);
  };

  return (
    <div className="login">
      <div className="login-hero">
        <div className="brand" style={{ padding: 0 }}>
          <div className="brand-logo"><Wallet size={18} /></div> PayTrack
        </div>
        <div>
          <h1>Every payment, <span>tracked</span> and approved.</h1>
          <p>One place for your CEO, admins and sales reps to record collections, approve payments and see where the money is.</p>
        </div>
        <p style={{ fontSize: 12 }}>Demo build · data is stored in your browser</p>
      </div>

      <div className="login-side">
        <div className="login-box">
          <h2 style={{ fontSize: 26, letterSpacing: "-.02em" }}>Sign in</h2>
          <p className="muted" style={{ fontSize: 14, margin: "6px 0 24px" }}>Choose a portal to continue (demo login).</p>

          {ROLES.map((r) => (
            <button key={r.role} className="role-card" onClick={() => enter(r.role)} disabled={!hydrated}>
              <div className="ic">{r.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{r.title}</div>
                <div className="muted">{r.desc}</div>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </button>
          ))}

          {hydrated && (
            <div className="field" style={{ marginTop: 18 }}>
              <label>Sign in as rep</label>
              <select className="select" value={repId} onChange={(e) => setRepId(e.target.value)}>
                {reps.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.region}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
