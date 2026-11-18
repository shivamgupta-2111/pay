"use client";
import { useState } from "react";
import { Check, X, ArrowUpRight, Trash2, Undo2 } from "lucide-react";
import { useMe, useStore } from "@/store/useStore";
import { fmtDate, money } from "@/lib/format";
import { Modal } from "./ui";

export default function ApprovalsView() {
  const me = useMe()!;
  const { payments, users, settings, approve, reject, deletePayment, updatePayment } = useStore();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const queue = payments.filter((p) => (me.role === "ceo" ? p.approval === "pending_ceo" : p.approval === "pending_admin"));
  const deletions = me.role === "admin" ? payments.filter((p) => p.deleteRequested) : [];
  const repName = (id: string) => users.find((u) => u.id === id)?.name ?? "—";

  return (
    <>
      <div className="card">
        <div className="card-title">
          <span>{me.role === "ceo" ? "Payments awaiting your final approval" : "Rep entries awaiting review"}</span>
          <span className="muted">
            {me.role === "admin" ? `Your limit: ${money(settings.adminLimit, settings.currency)} — larger amounts go to the CEO` : `${queue.length} pending`}
          </span>
        </div>
        {queue.map((p) => {
          const escalate = me.role === "admin" && p.amount > settings.adminLimit;
          return (
            <div className="approval" key={p.id}>
              <div className="avatar">{p.type === "incoming" ? "IN" : "OUT"}</div>
              <div className="info">
                <div className="title">{p.title}</div>
                <div className="muted">{p.customer} · {p.category} · due {fmtDate(p.dueDate)} · by {repName(p.repId)}</div>
                {p.notes && <div className="muted">“{p.notes}”</div>}
              </div>
              <div className="amt">{money(p.amount, settings.currency)}</div>
              <button className="btn btn-danger btn-sm" onClick={() => { setRejecting(p.id); setReason(""); }}><X size={14} /> Reject</button>
              {escalate ? (
                <button className="btn btn-dark btn-sm" onClick={() => approve(p.id)}><ArrowUpRight size={14} /> Forward to CEO</button>
              ) : (
                <button className="btn btn-success btn-sm" onClick={() => approve(p.id)}><Check size={14} /> Approve</button>
              )}
            </div>
          );
        })}
        {!queue.length && <div className="empty">🎉 All caught up — nothing to approve.</div>}
      </div>

      {me.role === "admin" && (
        <div className="card mt">
          <div className="card-title">Deletion requests from reps</div>
          {deletions.map((p) => (
            <div className="approval" key={p.id}>
              <div className="info">
                <div className="title">{p.title}</div>
                <div className="muted">{p.customer} · requested by {repName(p.repId)}</div>
              </div>
              <div className="amt">{money(p.amount, settings.currency)}</div>
              <button className="btn btn-sm" onClick={() => updatePayment(p.id, { deleteRequested: false })}><Undo2 size={14} /> Keep</button>
              <button className="btn btn-danger btn-sm" onClick={() => deletePayment(p.id)}><Trash2 size={14} /> Delete</button>
            </div>
          ))}
          {!deletions.length && <div className="empty">No deletion requests.</div>}
        </div>
      )}

      {rejecting && (
        <Modal title="Reject payment" onClose={() => setRejecting(null)}>
          <div className="field">
            <label>Reason (shown to the rep)</label>
            <textarea className="textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Receipt missing, wrong amount…" />
          </div>
          <div className="modal-foot">
            <button className="btn" onClick={() => setRejecting(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={!reason.trim()} onClick={() => { reject(rejecting, reason.trim()); setRejecting(null); }}>Reject</button>
          </div>
        </Modal>
      )}
    </>
  );
}
