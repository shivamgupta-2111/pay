"use client";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Clock, AlertTriangle, Target, CheckCircle2 } from "lucide-react";
import { useMe, useStore } from "@/store/useStore";
import { effectiveStatus, fmtDate, money, monthKey, todayISO } from "@/lib/format";
import { ApprovalBadge, Progress, StatCard, StatusBadge } from "./ui";
import { CategoryPie, MonthlyChart, RepBarChart } from "./Charts";

export default function DashboardView() {
  const me = useMe()!;
  const { payments, users, settings } = useStore();
  const cur = settings.currency;
  const m = (n: number) => money(n, cur);

  const scoped = me.role === "rep" ? payments.filter((p) => p.repId === me.id) : payments;
  const approved = scoped.filter((p) => p.approval === "approved");
  const thisMonth = monthKey(todayISO());

  const received = approved.filter((p) => p.type === "incoming" && p.status === "paid").reduce((a, p) => a + p.amount, 0);
  const spent = approved.filter((p) => p.type === "outgoing" && p.status === "paid").reduce((a, p) => a + p.amount, 0);
  const pending = approved.filter((p) => effectiveStatus(p) === "pending");
  const overdue = approved.filter((p) => effectiveStatus(p) === "overdue");
  const awaiting = scoped.filter((p) => p.approval === "pending_admin" || p.approval === "pending_ceo");

  const collectedBy = (repId: string) =>
    payments
      .filter((p) => p.repId === repId && p.type === "incoming" && p.status === "paid" && p.approval === "approved" && monthKey(p.dueDate) === thisMonth)
      .reduce((a, p) => a + p.amount, 0);

  const reps = users.filter((u) => u.role === "rep" && u.active);
  const repData = reps.map((r) => ({ name: r.name.split(" ")[0], Collected: collectedBy(r.id), Target: r.target }));

  const upcoming = approved
    .filter((p) => p.status !== "paid")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 6);

  const myCollected = collectedBy(me.id);
  const myPct = me.target ? Math.round((myCollected / me.target) * 100) : 0;

  return (
    <>
      <div className="grid grid-4">
        {me.role === "rep" ? (
          <>
            <StatCard dark label="Collected this month" value={m(myCollected)} hint={`${myPct}% of ${m(me.target)} target`} icon={<Target size={20} />} />
            <StatCard label="Total collected" value={m(received)} hint="All time, approved" icon={<ArrowDownLeft size={20} />} />
            <StatCard label="Awaiting approval" value={String(awaiting.length)} hint={m(awaiting.reduce((a, p) => a + p.amount, 0))} icon={<Clock size={20} />} />
            <StatCard label="Overdue customers" value={String(overdue.length)} hint={m(overdue.reduce((a, p) => a + p.amount, 0))} icon={<AlertTriangle size={20} />} />
          </>
        ) : (
          <>
            <StatCard dark label="Net cash flow" value={m(received - spent)} hint={`${m(received)} in · ${m(spent)} out`} icon={<ArrowUpRight size={20} />} />
            <StatCard label="Pending collections" value={m(pending.reduce((a, p) => a + (p.type === "incoming" ? p.amount : 0), 0))} hint={`${pending.length} payments`} icon={<Clock size={20} />} />
            <StatCard label="Overdue" value={m(overdue.reduce((a, p) => a + p.amount, 0))} hint={`${overdue.length} payments`} icon={<AlertTriangle size={20} />} />
            <StatCard label="Awaiting approval" value={String(awaiting.length)} hint={me.role === "ceo" ? `${scoped.filter((p) => p.approval === "pending_ceo").length} need your sign-off` : "From reps"} icon={<CheckCircle2 size={20} />} />
          </>
        )}
      </div>

      {me.role === "rep" && (
        <div className="card mt">
          <div className="card-title"><span>Monthly target progress</span><span className="muted">{m(myCollected)} / {m(me.target)}</span></div>
          <Progress value={myPct} />
        </div>
      )}

      <div className="grid grid-2 mt">
        <div className="card">
          <div className="card-title">Received vs paid — last 6 months</div>
          <MonthlyChart payments={approved} currency={cur} />
        </div>
        <div className="card">
          <div className="card-title">By category</div>
          <CategoryPie payments={approved} currency={cur} />
        </div>
      </div>

      <div className={`grid ${me.role === "rep" ? "" : "grid-eq"} mt`}>
        {me.role !== "rep" && (
          <div className="card">
            <div className="card-title"><span>Rep performance (this month)</span>{me.role === "ceo" && <Link className="btn btn-sm" href="/ceo/team">Set targets</Link>}</div>
            <RepBarChart data={repData} currency={cur} />
          </div>
        )}
        <div className="card">
          <div className="card-title">
            <span>Upcoming & overdue</span>
            <Link className="btn btn-sm" href={`/${me.role}/payments`}>View all</Link>
          </div>
          <div className="table-wrap">
            <table>
              <tbody>
                {upcoming.map((p) => (
                  <tr key={p.id}>
                    <td><div style={{ fontWeight: 600 }}>{p.customer}</div><div className="muted">{p.title}</div></td>
                    <td className="muted">{fmtDate(p.dueDate)}</td>
                    <td><StatusBadge s={effectiveStatus(p)} /></td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{m(p.amount)}</td>
                  </tr>
                ))}
                {!upcoming.length && <tr><td className="empty">Nothing due 🎉</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {me.role === "rep" && awaiting.length + scoped.filter((p) => p.approval === "rejected").length > 0 && (
        <div className="card mt">
          <div className="card-title">My submissions</div>
          <table>
            <tbody>
              {scoped.filter((p) => p.approval !== "approved").slice(0, 8).map((p) => (
                <tr key={p.id}>
                  <td><div style={{ fontWeight: 600 }}>{p.title}</div><div className="muted">{p.customer}{p.rejectReason ? ` · Reason: ${p.rejectReason}` : ""}</div></td>
                  <td><ApprovalBadge a={p.approval} /></td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{m(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
