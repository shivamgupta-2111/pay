"use client";
import { Icon } from "@/components/Icon";
import { useState } from "react";
import { useMe, useStore } from "@/store/useStore";
import type { Channel, Payment, TemplateKind } from "@/lib/types";
import { balance, fmtDate, money, timeAgo, todayISO } from "@/lib/format";
import { fillTemplate, mailLink, smsLink, telLink, templateKind, waLink } from "@/lib/billing";
import { Modal } from "./ui";

const CHANNEL_LABEL: Record<Channel, string> = { whatsapp: "WhatsApp", sms: "SMS", email: "Email", call: "Call", copied: "Copied" };

function useCtx(p: Payment) {
  const { customers, products, settings } = useStore();
  const customer = customers.find((c) => c.id === p.customerId);
  const product = products.find((x) => x.id === p.productId);
  return { customer, product, settings };
}

/* ---------------- Send reminder ---------------- */
export function ReminderModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const ctx = useCtx(payment);
  const logReminder = useStore((s) => s.logReminder);
  const [kind, setKind] = useState<TemplateKind>(templateKind(payment));
  const [msg, setMsg] = useState(fillTemplate(ctx.settings.templates[kind], payment, ctx));
  const [done, setDone] = useState<Channel | null>(null);
  const phone = ctx.customer?.phone ?? "";
  const email = ctx.customer?.email ?? "";

  const switchKind = (k: TemplateKind) => {
    setKind(k);
    setMsg(fillTemplate(ctx.settings.templates[k], payment, ctx));
  };
  const send = (channel: Channel, href?: string) => {
    if (href) window.open(href, "_blank");
    logReminder([payment.id], channel);
    setDone(channel);
  };

  return (
    <Modal title={`Remind ${payment.customer}`} onClose={onClose}>
      <div className="remind-head">
        <div>
          <div style={{ fontWeight: 700 }}>{payment.invoiceNo ?? payment.title}</div>
          <div className="muted">{payment.title} · due {fmtDate(payment.dueDate)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{money(balance(payment), ctx.settings.currency)}</div>
          <div className="muted">{ctx.customer ? `${ctx.customer.contact} · ${phone}` : "No contact saved"}</div>
        </div>
      </div>

      <div className="seg" style={{ margin: "16px 0 10px" }}>
        {(["upcoming", "due", "overdue"] as TemplateKind[]).map((k) => (
          <button key={k} className={kind === k ? "on" : ""} onClick={() => switchKind(k)}>
            {k === "upcoming" ? "Upcoming" : k === "due" ? "Due today" : "Overdue"}
          </button>
        ))}
      </div>
      <textarea className="textarea" rows={8} value={msg} onChange={(e) => setMsg(e.target.value)} />

      <div className="channel-row">
        <button className="btn btn-wa" disabled={!phone} onClick={() => send("whatsapp", waLink(phone, msg))}><Icon name="whatsapp" size={16} /> WhatsApp</button>
        <button className="btn" disabled={!phone} onClick={() => send("sms", smsLink(phone, msg))}><Icon name="sms" size={16} /> SMS</button>
        <button className="btn" disabled={!email} onClick={() => send("email", mailLink(email, `Payment reminder – ${payment.invoiceNo ?? payment.title}`, msg))}><Icon name="email" size={16} /> Email</button>
        <button className="btn" disabled={!phone} onClick={() => send("call", telLink(phone))}><Icon name="call" size={16} /> Call</button>
        <button className="btn" onClick={() => { navigator.clipboard?.writeText(msg); send("copied"); }}><Icon name="copy" size={16} /> Copy</button>
      </div>
      {done && <p className="ok-note"><Icon name="check" size={14} /> Logged as reminded via {CHANNEL_LABEL[done]}.</p>}

      <History payment={payment} />
    </Modal>
  );
}

function History({ payment }: { payment: Payment }) {
  const items = [
    ...payment.reminders.map((r) => ({ at: r.at, text: `Reminder via ${CHANNEL_LABEL[r.channel]} (${r.kind})`, by: r.by })),
    ...payment.followUps.map((f) => ({ at: f.at, text: `Follow-up: ${f.note}${f.promiseDate ? ` · promised ${fmtDate(f.promiseDate)}` : ""}`, by: f.by })),
    ...payment.receipts.map((r) => ({ at: r.date + "T12:00:00", text: `Received ${r.amount.toLocaleString("en-IN")} via ${r.method}${r.verified ? "" : " (unverified)"}`, by: r.by })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  if (!items.length) return null;
  return (
    <div style={{ marginTop: 20 }}>
      <div className="field"><label>Activity</label></div>
      <div className="timeline">
        {items.slice(0, 8).map((i, k) => (
          <div key={k}><span>{i.text}</span><span className="muted">{i.by} · {timeAgo(i.at)}</span></div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Record payment (full / partial) ---------------- */
export function RecordPaymentModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const me = useMe()!;
  const { settings, recordPayment } = useStore();
  const due = balance(payment);
  const [f, setF] = useState({ amount: String(due), method: settings.methods[0], reference: "", date: todayISO() });
  const amt = Number(f.amount);
  const valid = amt > 0 && amt <= due;

  return (
    <Modal title="Record payment received" onClose={onClose}>
      <p className="muted" style={{ marginBottom: 14 }}>
        {payment.customer} · {payment.invoiceNo ?? payment.title} · balance <b>{money(due, settings.currency)}</b> of {money(payment.amount, settings.currency)}
      </p>
      <div className="form-grid">
        <div className="field">
          <label>Amount received</label>
          <input className="input" type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          <div style={{ display: "flex", gap: 6 }}>
            <button className="chip" onClick={() => setF({ ...f, amount: String(due) })}>Full</button>
            <button className="chip" onClick={() => setF({ ...f, amount: String(Math.round(due / 2)) })}>Half</button>
          </div>
        </div>
        <div className="field"><label>Date</label><input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
        <div className="field">
          <label>Method</label>
          <select className="select" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{settings.methods.map((m) => <option key={m}>{m}</option>)}</select>
        </div>
        <div className="field"><label>Reference / UTR</label><input className="input" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="optional" /></div>
      </div>
      {amt > 0 && amt < due && <p className="muted" style={{ marginTop: 12 }}>Partial payment – {money(due - amt, settings.currency)} will remain due and reminders will continue.</p>}
      {me.role === "rep" && <p className="muted" style={{ marginTop: 8 }}>This collection will be sent to Admin for verification.</p>}
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => { recordPayment(payment.id, { amount: amt, method: f.method, reference: f.reference || undefined, date: f.date }); onClose(); }}>
          Save payment
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- Follow-up / promise to pay ---------------- */
const QUICK = ["No answer", "Will pay today", "Will pay this week", "Asked for invoice copy", "Payment in process", "Disputed amount", "Wants to cancel"];

export function FollowUpModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const addFollowUp = useStore((s) => s.addFollowUp);
  const [note, setNote] = useState("");
  const [promise, setPromise] = useState("");

  return (
    <Modal title="Log follow-up" onClose={onClose}>
      <p className="muted" style={{ marginBottom: 12 }}>{payment.customer} · {payment.invoiceNo ?? payment.title}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {QUICK.map((q) => <button key={q} className="chip" onClick={() => setNote(q)}>{q}</button>)}
      </div>
      <div className="field"><label>Note</label><textarea className="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did the customer say?" /></div>
      <div className="field" style={{ marginTop: 12 }}>
        <label>Promise-to-pay date (pauses reminders until then)</label>
        <input className="input" type="date" min={todayISO()} value={promise} onChange={(e) => setPromise(e.target.value)} />
      </div>
      <History payment={payment} />
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!note.trim()} onClick={() => { addFollowUp(payment.id, note.trim(), promise || undefined); onClose(); }}>Save follow-up</button>
      </div>
    </Modal>
  );
}
