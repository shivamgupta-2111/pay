"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard, CheckCircle2, Wallet, Users, Target, ScrollText, Settings, LogOut, Contact, RotateCcw, Bell,
} from "lucide-react";
import { useMe, useStore } from "@/store/useStore";
import { ROLE_LABEL } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { initials, useHydrated } from "./ui";

type NavItem = { href: string; label: string; icon: React.ReactNode; badge?: "approvals" };

const NAV: Record<Role, NavItem[]> = {
  ceo: [
    { href: "/ceo", label: "Overview", icon: <LayoutDashboard size={18} /> },
    { href: "/ceo/approvals", label: "Approvals", icon: <CheckCircle2 size={18} />, badge: "approvals" },
    { href: "/ceo/payments", label: "All Payments", icon: <Wallet size={18} /> },
    { href: "/ceo/team", label: "Team & Targets", icon: <Target size={18} /> },
    { href: "/ceo/audit", label: "Audit Log", icon: <ScrollText size={18} /> },
    { href: "/ceo/settings", label: "Approval Limits", icon: <Settings size={18} /> },
  ],
  admin: [
    { href: "/admin", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/admin/approvals", label: "Approvals", icon: <CheckCircle2 size={18} />, badge: "approvals" },
    { href: "/admin/payments", label: "Payments", icon: <Wallet size={18} /> },
    { href: "/admin/users", label: "Users", icon: <Users size={18} /> },
    { href: "/admin/settings", label: "Settings", icon: <Settings size={18} /> },
  ],
  rep: [
    { href: "/rep", label: "My Dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/rep/payments", label: "My Payments", icon: <Wallet size={18} /> },
    { href: "/rep/customers", label: "My Customers", icon: <Contact size={18} /> },
  ],
};

export default function PortalShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const hydrated = useHydrated();
  const me = useMe();
  const router = useRouter();
  const path = usePathname();
  const logout = useStore((s) => s.logout);
  const resetDemo = useStore((s) => s.resetDemo);
  const payments = useStore((s) => s.payments);

  // Role guard: not logged in → login; wrong portal → own portal
  useEffect(() => {
    if (!hydrated) return;
    if (!me || !me.active) router.replace("/login");
    else if (me.role !== role) router.replace(`/${me.role}`);
  }, [hydrated, me, role, router]);

  if (!hydrated || !me || me.role !== role) return <div className="loading">Loading…</div>;

  const pendingCount =
    role === "ceo"
      ? payments.filter((p) => p.approval === "pending_ceo").length
      : role === "admin"
      ? payments.filter((p) => p.approval === "pending_admin" || p.deleteRequested).length
      : payments.filter((p) => p.repId === me.id && p.approval === "rejected").length;

  const current = NAV[role].filter((n) => path === n.href || (n.href !== `/${role}` && path.startsWith(n.href))).pop();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo"><Wallet size={18} /></div>
          PayTrack
        </div>
        <span className="role-pill">{ROLE_LABEL[role]} Portal</span>
        <nav className="nav">
          {NAV[role].map((n) => (
            <Link key={n.href} href={n.href} className={current?.href === n.href ? "active" : ""}>
              {n.icon}
              {n.label}
              {n.badge && pendingCount > 0 && <span className="count">{pendingCount}</span>}
            </Link>
          ))}
        </nav>
        <button className="btn btn-ghost btn-sm" style={{ color: "var(--text-muted-dark)", marginBottom: 10 }} onClick={() => confirm("Reset all demo data?") && resetDemo()}>
          <RotateCcw size={14} /> Reset demo data
        </button>
        <div className="user-card">
          <div className="avatar">{initials(me.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="name">{me.name}</div>
            <div className="sub">{me.email}</div>
          </div>
          <button className="icon-btn" title="Logout" style={{ color: "var(--text-muted-dark)" }} onClick={() => { logout(); router.push("/login"); }}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <h1>{current?.label ?? "Dashboard"}</h1>
            <p>Welcome back, {me.name.split(" ")[0]} · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <div style={{ position: "relative" }} title={role === "rep" ? "Rejected entries" : "Pending approvals"}>
            <Bell size={20} color="var(--text-muted)" />
            {pendingCount > 0 && (
              <span style={{ position: "absolute", top: -6, right: -8, background: "var(--orange-brand)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 6px" }}>
                {pendingCount}
              </span>
            )}
          </div>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
