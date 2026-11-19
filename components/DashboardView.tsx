"use client";
import { Icon } from "@/components/Icon";
import Link from "next/link";
import { useState } from "react";
import { useMe, useStore } from "@/store/useStore";
import type { Payment } from "@/lib/types";
import { addDays, balance, effectiveStatus, fmtDate, money, monthKey, todayISO } from "@/lib/format";
import { dueLabel, isRemindable, mrrOf, needsReminderToday } from "@/lib/billing";
import { ApprovalBadge, Progress, StatCard } from "./ui";
import { CategoryPie, MonthlyChart, RepBarChart } from "./Charts";
import { ReminderModal } from "./PaymentActions";

export default function DashboardView() {
  const me = useMe()!;
  const { payments, users, settings, subscriptions } = useStore();
  const [remind, setRemind] = useState<Payment | null>(null);
  const cur = settings.currency;
  const m = (n: number) => money(n, cur);
  const isRep = me.role === "rep";

  const scoped = isRep ? payments.filter((p) => p.repId === me.id) : payments;
  const subs = (isRep ? subscriptions.filter((s) => s.repId === me.id) : subscriptions).filter((s) => s.status === "active");
  const approved = scoped.filter((p) => p.approval === "approved");
  const thisMonth = monthKey(todayISO());

  const mrr = subs.reduce((a, s) => a + mrrOf(s), 0);
  const received = scoped.filter((p) => p.type === "incoming").reduce((a, p) => a + p.paidAmount, 0);
  const spent = approved.filter((p) => p.type === "outgoing").reduce((a, p) => a + p.paidAmount, 0);
  const open = scoped.filter(isRemindable);
  const overdue = open.filter((p) => p.dueDate < todayISO());
  const next7 = open.filter((p) => p.dueDate >= todayISO() && p.dueDate <= addDays(todayISO(), 7));
  const toRemind = open.filter((p) => needsReminderToday(p, settings)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const awaiting = scoped.filter((p) => p.approval === "pending_admin" || p.approval === "pending_ceo");
  const sum = (ps: Payment[]) => ps.reduce((a, p) => a + balance(p), 0);

  const collectedBy = (repId: string) =>
    payments.filter((p) => p.repId === repId && p.type === "incoming" && monthKey(p.dueDate) === thisMonth).reduce((a, p) => a + p.paidAmount, 0);
  const repData = users.filter((u) => u.role === "rep" && u.active).map((r) => ({ name: r.name.split(" ")[0], Collected: collectedBy(r.id), Target: r.target }));
  const myCollected = collectedBy(me.id);
  const myPct = me.target ? Math.round((myCollected / me.target) * 100) : 0;
  const collectionRate = (() => {
    const due = scoped.filter((p) => p.type === "incoming" && p.dueDate <= todayISO() && p.approval !== "rejected");
    const tot = due.reduce((a, p) => a + p.amount, 0);
    return tot ? Math.round((due.reduce((a, p) => a + p.paidAmount, 0) / tot) * 100) : 100;
  })();

  return (
    <>
      <div className="grid grid-4">
        {isRep ? (
          <StatCard dark label="Collected this month" value={m(myCollected)} hint={`${myPct}% of ${m(me.target)} target`} icon={<Icon name="target" size={20} />} />
        ) : (
          <StatCard dark label="Monthly recurring revenue" value={m(mrr)} hint={`${subs.length} active subscriptions · ARR ${m(mrr * 12)}`} icon={<Icon name="subscription" size={20} />} />
        )}
        <StatCard label="Reminders to send today" value={String(toRemind.length)} hint={m(sum(toRemind))} icon={<Icon name="reminder" size={20} />} />
        <StatCard label="Overdue" value={m(sum(overdue))} hint={`${overdue.length} invoices · ${collectionRate}% collection rate`} icon={<Icon name="warning" size={20} />} />
        <StatCard label="Due in next 7 days" value={m(sum(next7))} hint={`${next7.length} invoices`} icon={<Icon name="arrowUpRight" size={20} />} />
      </div>

      {isRep && (
        <div className="card mt">
          <div className="card-title"><span>Monthly target progress · my MRR {m(mrr)}</span><span className="muted">{m(myCollected)} / {m(me.target)}</span></div>
          <Progress value={myPct} />
        </div>
      )}

      <div className="grid grid-2 mt">
        <div className="card">
          <div className="card-title">
            <span>Today&apos;s reminders</span>
            <Link className="btn btn-sm btn-primary" href={`/${me.role}/reminders`}>Open reminders</Link>
          </div>
          <div className="reminder-list">
            {toRemind.slice(0, 6).map((p) => {
              const dl = dueLabel(p);
              return (
                <div key={p.id}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{p.customer}</div>
                    <div className="muted">{p.invoiceNo} · {p.title}</div>
                  </div>
                  <span className={`badge ${dl.cls}`}>{dl.text}</span>
                  <b style={{ width: 100, textAlign: "right" }}>{m(balance(p))}</b>
                  <button className="btn btn-sm" onClick={() => setRemind(p)}><Icon name="reminder" size={14} /> Remind</button>
                </div>
              );
            })}
            {!toRemind.length && <div className="empty">🎉 All reminders sent for today.</div>}
          </div>
        </div>
        <div className="card">
          <div className="card-title">{isRep ? "My numbers" : "Cash position"}</div>
          <div className="reminder-list">
            <div><Icon name="wallet" size={18} color="var(--orange-brand)" /><span style={{ flex: 1 }}>Collected (all time)</span><b>{m(received)}</b></div>
            {!isRep && <div><Icon name="wallet" size={18} color="var(--text-muted)" /><span style={{ flex: 1 }}>Expenses paid</span><b>{m(spent)}</b></div>}
            <div><Icon name="warning" size={18} color="var(--red)" /><span style={{ flex: 1 }}>Total outstanding</span><b>{m(sum(open))}</b></div>
            <div><Icon name="approvals" size={18} color="var(--blue)" /><span style={{ flex: 1 }}>Awaiting approval</span><b>{awaiting.length}</b></div>
            <div><Icon name="subscription" size={18} color="var(--green)" /><span style={{ flex: 1 }}>Active subscriptions</span><b>{subs.length}</b></div>
          </div>
        </div>
      </div>

      <div className="grid grid-2 mt">
        <div className="card">
          <div className="card-title">Collected vs spent — last 6 months</div>
          <MonthlyChart payments={isRep ? scoped : approved} currency={cur} />
        </div>
        <div className="card">
          <div className="card-title">Revenue by category</div>
          <CategoryPie payments={scoped.filter((p) => p.type === "incoming")} currency={cur} />
        </div>
      </div>

      {!isRep && (
        <div className="card mt">
          <div className="card-title"><span>Rep collections (this month)</span>{me.role === "ceo" && <Link className="btn btn-sm" href="/ceo/team">Set targets</Link>}</div>
          <RepBarChart data={repData} currency={cur} />
        </div>
      )}

      {isRep && awaiting.length + scoped.filter((p) => p.approval === "rejected" || p.rejectReason).length > 0 && (
        <div className="card mt">
          <div className="card-title">My submissions</div>
          <table>
            <tbody>
              {scoped.filter((p) => p.approval !== "approved" || p.rejectReason).slice(0, 8).map((p) => (
                <tr key={p.id}>
                  <td><div style={{ fontWeight: 600 }}>{p.title}</div><div className="muted">{p.customer}{p.rejectReason ? ` · ${p.rejectReason}` : ""}</div></td>
                  <td><ApprovalBadge a={p.approval} /></td>
                  <td className="muted">{fmtDate(p.dueDate)} · {effectiveStatus(p)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{m(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {remind && <ReminderModal payment={remind} onClose={() => setRemind(null)} />}
    </>
  );
}
