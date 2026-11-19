"use client";
import { Icon } from "@/components/Icon";
import { useMemo, useState } from "react";
import { useMe, useStore } from "@/store/useStore";
import type { Payment } from "@/lib/types";
import { balance, fmtDate, money, timeAgo } from "@/lib/format";
import {
  bucketOf, dueLabel, fillTemplate, isRemindable, isSnoozed, lastReminder, needsReminderToday, printInvoice, telLink, templateKind, waLink,
} from "@/lib/billing";
import { StatCard } from "./ui";
import { FollowUpModal, RecordPaymentModal, ReminderModal } from "./PaymentActions";

type Tab = "today" | "overdue" | "due" | "upcoming" | "promised" | "snoozed" | "all";
const TABS: [Tab, string][] = [
  ["today", "To remind today"], ["overdue", "Overdue"], ["due", "Due today"], ["upcoming", "Upcoming"],
  ["promised", "Promised"], ["snoozed", "Snoozed"], ["all", "All unpaid"],
];

export default function RemindersView() {
  const me = useMe()!;
  const { payments, customers, products, users, settings, logReminder, snooze, unsnooze } = useStore();
  const cur = settings.currency;
  const [tab, setTab] = useState<Tab>("today");
  const [q, setQ] = useState("");
  const [rep, setRep] = useState("all");
  const [sel, setSel] = useState<string[]>([]);
  const [remind, setRemind] = useState<Payment | null>(null);
  const [record, setRecord] = useState<Payment | null>(null);
  const [follow, setFollow] = useState<Payment | null>(null);
  const [toast, setToast] = useState("");

  const cust = (p: Payment) => customers.find((c) => c.id === p.customerId);
  const prod = (p: Payment) => products.find((x) => x.id === p.productId);
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(""), 2500); };

  const scoped = useMemo(
    () => payments.filter((p) => isRemindable(p) && (me.role === "rep" ? p.repId === me.id : rep === "all" || p.repId === rep)),
    [payments, me, rep]
  );

  const groups: Record<Tab, Payment[]> = useMemo(() => ({
    today: scoped.filter((p) => needsReminderToday(p, settings)),
    overdue: scoped.filter((p) => bucketOf(p, settings) === "overdue" && !isSnoozed(p)),
    due: scoped.filter((p) => bucketOf(p, settings) === "today"),
    upcoming: scoped.filter((p) => bucketOf(p, settings) === "upcoming" && !isSnoozed(p)),
    promised: scoped.filter((p) => !!p.promiseDate),
    snoozed: scoped.filter(isSnoozed),
    all: scoped,
  }), [scoped, settings]);

  const rows = groups[tab]
    .filter((p) => !q || `${p.customer} ${p.invoiceNo} ${p.title} ${cust(p)?.phone ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const sum = (ps: Payment[]) => ps.reduce((a, p) => a + balance(p), 0);
  const allSel = rows.length > 0 && rows.every((r) => sel.includes(r.id));
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const quickWhatsApp = (p: Payment) => {
    const c = cust(p);
    if (!c?.phone) return setRemind(p);
    const msg = fillTemplate(settings.templates[templateKind(p)], p, { customer: c, product: prod(p), settings });
    window.open(waLink(c.phone, msg), "_blank");
    logReminder([p.id], "whatsapp");
    flash(`WhatsApp opened for ${p.customer} – logged`);
  };

  const copyAll = () => {
    const text = rows
      .filter((r) => sel.includes(r.id))
      .map((p) => `${p.customer} (${cust(p)?.phone ?? "-"})\n${fillTemplate(settings.templates[templateKind(p)], p, { customer: cust(p), product: prod(p), settings })}`)
      .join("\n\n----------\n\n");
    navigator.clipboard?.writeText(text);
    logReminder(sel, "copied");
    flash(`${sel.length} messages copied & logged`);
    setSel([]);
  };

  const enableAlerts = async () => {
    if (typeof Notification === "undefined") return flash("Desktop alerts are not supported in this browser");
    const res = await Notification.requestPermission();
    if (res === "granted") new Notification("PayTrack", { body: `${groups.today.length} payment reminder(s) to send today` });
    flash(res === "granted" ? "Desktop alerts enabled" : "Permission denied");
  };

  return (
    <>
      <div className="grid grid-4">
        <StatCard dark label="Reminders to send today" value={String(groups.today.length)} hint={money(sum(groups.today), cur)} icon={<Icon name="reminder" size={20} />} />
        <StatCard label="Overdue" value={money(sum(groups.overdue), cur)} hint={`${groups.overdue.length} invoices`} icon={<Icon name="warning" size={20} />} />
        <StatCard label="Due today" value={money(sum(groups.due), cur)} hint={`${groups.due.length} invoices`} icon={<Icon name="calendarToday" size={20} />} />
        <StatCard label={`Next ${Math.max(...settings.reminderDays, 0)} days`} value={money(sum(groups.upcoming), cur)} hint={`${groups.upcoming.length} invoices`} icon={<Icon name="calendarUpcoming" size={20} />} />
      </div>

      <div className="card mt">
        <div className="tabs">
          {TABS.map(([k, l]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); setSel([]); }}>
              {l} <span>{groups[k].length}</span>
            </button>
          ))}
        </div>

        <div className="toolbar">
          <div className="search"><Icon name="search" size={16} /><input className="input" placeholder="Search customer, invoice, phone…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          {me.role !== "rep" && (
            <select className="select" value={rep} onChange={(e) => setRep(e.target.value)}>
              <option value="all">All reps</option>
              {users.filter((u) => u.role === "rep").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
          <button className="btn" onClick={enableAlerts}><Icon name="alertsOn" size={16} /> Desktop alerts</button>
        </div>

        {sel.length > 0 && (
          <div className="bulkbar">
            <b>{sel.length} selected</b>
            <button className="btn btn-sm" onClick={copyAll}><Icon name="copy" size={14} /> Copy messages</button>
            <button className="btn btn-sm" onClick={() => { logReminder(sel, "whatsapp"); flash(`${sel.length} marked as reminded`); setSel([]); }}><Icon name="markPaid" size={14} /> Mark reminded</button>
            <button className="btn btn-sm" onClick={() => { snooze(sel, 3); flash(`Snoozed ${sel.length} for 3 days`); setSel([]); }}><Icon name="snooze" size={14} /> Snooze 3 days</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSel([])}>Clear</button>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 32 }}><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? [] : rows.map((r) => r.id))} /></th>
                <th>Customer / invoice</th><th>Balance</th><th>Due</th><th>Last reminder</th><th>Notes</th><th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const c = cust(p);
                const last = lastReminder(p);
                const dl = dueLabel(p);
                const lastFU = p.followUps[p.followUps.length - 1];
                return (
                  <tr key={p.id} className={sel.includes(p.id) ? "row-sel" : ""}>
                    <td><input type="checkbox" checked={sel.includes(p.id)} onChange={() => toggle(p.id)} /></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.customer}</div>
                      <div className="muted">{p.invoiceNo ? `${p.invoiceNo} · ` : ""}{p.title}</div>
                      {c && <div className="muted">{c.contact} · {c.phone}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{money(balance(p), cur)}</div>
                      {p.paidAmount > 0 && <div className="muted">of {money(p.amount, cur)}</div>}
                    </td>
                    <td><div>{fmtDate(p.dueDate)}</div><span className={`badge ${dl.cls}`}>{dl.text}</span></td>
                    <td>
                      {last ? (<><div>{timeAgo(last.at)}</div><div className="muted">{last.channel} · {p.reminders.length} sent</div></>) : <span className="muted">Never</span>}
                      {needsReminderToday(p, settings) && <div><span className="badge b-orange">Due now</span></div>}
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      {p.promiseDate && <div><span className="badge b-green">Promised {fmtDate(p.promiseDate)}</span></div>}
                      {isSnoozed(p) && <div><span className="badge b-grey">Snoozed till {fmtDate(p.snoozedUntil!)}</span></div>}
                      {lastFU && <div className="muted" title={lastFU.note}>“{lastFU.note}”</div>}
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-primary btn-sm" onClick={() => setRemind(p)}><Icon name="reminder" size={14} /> Remind</button>
                        <button className="icon-btn wa" title="Quick WhatsApp" onClick={() => quickWhatsApp(p)}><Icon name="whatsapp" size={16} /></button>
                        {c?.phone && <a className="icon-btn" title="Call" href={telLink(c.phone)} onClick={() => { logReminder([p.id], "call"); setFollow(p); }}><Icon name="call" size={16} /></a>}
                        <button className="icon-btn" title="Record payment" onClick={() => setRecord(p)}><Icon name="rupee" size={16} /></button>
                        <button className="icon-btn" title="Follow-up / promise to pay" onClick={() => setFollow(p)}><Icon name="followUp" size={16} /></button>
                        <button className="icon-btn" title="Print invoice" onClick={() => printInvoice(p, c, prod(p), settings)}><Icon name="print" size={16} /></button>
                        {isSnoozed(p) ? (
                          <button className="btn btn-sm" onClick={() => unsnooze(p.id)}>Unsnooze</button>
                        ) : (
                          <select className="select snooze" value="" title="Snooze" onChange={(e) => { snooze([p.id], Number(e.target.value)); flash(`Snoozed ${p.customer}`); }}>
                            <option value="" disabled>Snooze</option>
                            <option value="1">1 day</option><option value="3">3 days</option><option value="7">7 days</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={7} className="empty">{tab === "today" ? "🎉 No reminders left for today." : "Nothing here."}</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Schedule: {settings.reminderDays.join(", ")} day(s) before due · on the due date · every {settings.overdueEvery} day(s) when overdue. A promise-to-pay date or snooze pauses reminders.
        </p>
      </div>

      {toast && <div className="toast">{toast}</div>}
      {remind && <ReminderModal payment={remind} onClose={() => setRemind(null)} />}
      {record && <RecordPaymentModal payment={record} onClose={() => setRecord(null)} />}
      {follow && <FollowUpModal payment={follow} onClose={() => setFollow(null)} />}
    </>
  );
}
