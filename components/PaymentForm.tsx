"use client";
import { useState } from "react";
import { useMe, useStore } from "@/store/useStore";
import type { Payment } from "@/lib/types";
import { money, todayISO } from "@/lib/format";
import { Modal } from "./ui";

export default function PaymentForm({ payment, onClose }: { payment?: Payment; onClose: () => void }) {
  const me = useMe()!;
  const { settings, users, addPayment, updatePayment } = useStore();
  const reps = users.filter((u) => u.role === "rep" && u.active);

  const [f, setF] = useState({
    title: payment?.title ?? "",
    customer: payment?.customer ?? "",
    amount: payment?.amount?.toString() ?? "",
    type: payment?.type ?? "incoming",
    method: payment?.method ?? settings.methods[0],
    category: payment?.category ?? settings.categories[0],
    dueDate: payment?.dueDate ?? todayISO(),
    status: payment?.status ?? "pending",
    repId: payment?.repId ?? (me.role === "rep" ? me.id : reps[0]?.id ?? ""),
    notes: payment?.notes ?? "",
  });
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  const amount = Number(f.amount);
  const needsCeo = me.role !== "ceo" && amount > settings.adminLimit;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim() || !f.customer.trim()) return setError("Title and customer are required.");
    if (!amount || amount <= 0) return setError("Enter a valid amount.");
    const data = {
      ...f,
      amount,
      type: f.type as Payment["type"],
      status: (me.role === "rep" ? "pending" : f.status) as Payment["status"],
    };
    if (payment) updatePayment(payment.id, data);
    else addPayment(data);
    onClose();
  };

  return (
    <Modal title={payment ? "Edit payment" : "New payment"} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="field full"><label>Title *</label><input className="input" value={f.title} onChange={set("title")} placeholder="Invoice #INV-2001" /></div>
          <div className="field"><label>Customer / Payee *</label><input className="input" value={f.customer} onChange={set("customer")} /></div>
          <div className="field"><label>Amount ({settings.currency}) *</label><input className="input" type="number" min="1" value={f.amount} onChange={set("amount")} /></div>
          <div className="field">
            <label>Type</label>
            <select className="select" value={f.type} onChange={set("type")}>
              <option value="incoming">Incoming (received)</option>
              <option value="outgoing">Outgoing (paid)</option>
            </select>
          </div>
          <div className="field"><label>Due date</label><input className="input" type="date" value={f.dueDate} onChange={set("dueDate")} /></div>
          <div className="field">
            <label>Category</label>
            <select className="select" value={f.category} onChange={set("category")}>{settings.categories.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div className="field">
            <label>Method</label>
            <select className="select" value={f.method} onChange={set("method")}>{settings.methods.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          {me.role !== "rep" && (
            <>
              <div className="field">
                <label>Assigned rep</label>
                <select className="select" value={f.repId} onChange={set("repId")}>{reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
              </div>
              <div className="field">
                <label>Status</label>
                <select className="select" value={f.status} onChange={set("status")}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </>
          )}
          <div className="field full"><label>Notes</label><textarea className="textarea" rows={3} value={f.notes} onChange={set("notes")} /></div>
        </div>

        {!payment && (
          <p className="muted" style={{ marginTop: 14 }}>
            {me.role === "rep"
              ? `This entry will be sent to Admin for approval${needsCeo ? `, then to the CEO (above ${money(settings.adminLimit)})` : ""}.`
              : needsCeo
              ? `Amount is above your approval limit of ${money(settings.adminLimit)} — it will be sent to the CEO.`
              : "This entry will be auto-approved."}
          </p>
        )}
        {error && <p style={{ color: "var(--red)", fontSize: 13, marginTop: 10 }}>{error}</p>}

        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{payment ? "Save changes" : "Add payment"}</button>
        </div>
      </form>
    </Modal>
  );
}
