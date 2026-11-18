"use client";
import { useMemo, useState } from "react";
import { Search, Plus, Download, Pencil, Trash2, CheckCheck, Flag, BellRing, IndianRupee, Printer, NotebookPen } from "lucide-react";
import { useMe, useStore } from "@/store/useStore";
import { can } from "@/lib/permissions";
import type { Payment } from "@/lib/types";
import { downloadCSV, effectiveStatus, fmtDate, money } from "@/lib/format";
import { ApprovalBadge, StatusBadge } from "./ui";
import PaymentForm from "./PaymentForm";
import { FollowUpModal, RecordPaymentModal, ReminderModal } from "./PaymentActions";
import { isRemindable, printInvoice } from "@/lib/billing";

export default function PaymentsView() {
  const me = useMe()!;
  const { payments, users, customers, products, settings, deletePayment, requestDelete, markPaid } = useStore();
  const [remind, setRemind] = useState<Payment | null>(null);
  const [record, setRecord] = useState<Payment | null>(null);
  const [follow, setFollow] = useState<Payment | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [approval, setApproval] = useState("all");
  const [type, setType] = useState("all");
  const [rep, setRep] = useState("all");
  const [editing, setEditing] = useState<Payment | null>(null);
  const [creating, setCreating] = useState(false);

  const role = me.role;
  const repName = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  const reps = users.filter((u) => u.role === "rep");

  const rows = useMemo(() => {
    const scoped = can(role, "payments:view_all") ? payments : payments.filter((p) => p.repId === me.id);
    return scoped.filter((p) => {
      const s = q.toLowerCase();
      if (s && !`${p.title} ${p.invoiceNo ?? ""} ${p.customer} ${p.amount} ${p.notes ?? ""}`.toLowerCase().includes(s)) return false;
      if (status !== "all" && effectiveStatus(p) !== status) return false;
      if (approval !== "all" && p.approval !== approval) return false;
      if (type !== "all" && p.type !== type) return false;
      if (rep !== "all" && p.repId !== rep) return false;
      return true;
    });
  }, [payments, role, me.id, q, status, approval, type, rep]);

  const total = rows.reduce((a, p) => a + (p.type === "incoming" ? p.amount : -p.amount), 0);

  const canEdit = (p: Payment) =>
    can(role, "payments:edit_any") || (can(role, "payments:edit_own_pending") && p.repId === me.id && p.approval === "pending_admin");

  const exportCSV = () =>
    downloadCSV(
      `payments-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((p) => ({
        Title: p.title, Customer: p.customer, Amount: p.amount, Type: p.type, Category: p.category, Method: p.method,
        DueDate: p.dueDate, Status: effectiveStatus(p), Approval: p.approval, Rep: repName(p.repId), Notes: p.notes ?? "",
      }))
    );

  return (
    <div className="card">
      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input className="input" placeholder="Search title, customer, amount…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All status</option><option value="paid">Paid</option><option value="partial">Partial</option><option value="pending">Pending</option><option value="overdue">Overdue</option>
        </select>
        <select className="select" value={approval} onChange={(e) => setApproval(e.target.value)}>
          <option value="all">All approvals</option><option value="pending_admin">Awaiting Admin</option><option value="pending_ceo">Awaiting CEO</option>
          <option value="approved">Approved</option><option value="rejected">Rejected</option>
        </select>
        <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">In & Out</option><option value="incoming">Incoming</option><option value="outgoing">Outgoing</option>
        </select>
        {can(role, "payments:view_all") && (
          <select className="select" value={rep} onChange={(e) => setRep(e.target.value)}>
            <option value="all">All reps</option>{reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
        <button className="btn" onClick={exportCSV}><Download size={16} /> Export</button>
        {can(role, "payments:create") && <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> New payment</button>}
      </div>

      <p className="muted" style={{ marginBottom: 10 }}>{rows.length} records · Net {money(total, settings.currency)}</p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Payment</th><th>Amount</th><th>Due</th><th>Status</th><th>Approval</th>
              {can(role, "payments:view_all") && <th>Rep</th>}
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const s = effectiveStatus(p);
              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.invoiceNo ? `${p.invoiceNo} · ` : ""}{p.title}</div>
                    <div className="muted">{p.customer} · {p.category} · {p.method}</div>
                    {p.approval === "rejected" && p.rejectReason && <div className="muted" style={{ color: "var(--red)" }}>Reason: {p.rejectReason}</div>}
                    {p.deleteRequested && <div className="muted" style={{ color: "var(--orange-dark)" }}>Deletion requested</div>}
                  </td>
                  <td className={p.type === "incoming" ? "amount-in" : "amount-out"}>
                    {p.type === "incoming" ? "+" : "−"}{money(p.amount, settings.currency)}
                    {p.paidAmount > 0 && p.status !== "paid" && <div className="muted">paid {money(p.paidAmount, settings.currency)}</div>}
                  </td>
                  <td>{fmtDate(p.dueDate)}</td>
                  <td><StatusBadge s={s} /></td>
                  <td><ApprovalBadge a={p.approval} /></td>
                  {can(role, "payments:view_all") && <td>{repName(p.repId)}</td>}
                  <td>
                    <div className="actions">
                      {isRemindable(p) && <button className="icon-btn" title="Send reminder" onClick={() => setRemind(p)}><BellRing size={16} /></button>}
                      {isRemindable(p) && <button className="icon-btn" title="Log follow-up" onClick={() => setFollow(p)}><NotebookPen size={16} /></button>}
                      {can(role, "payments:record") && p.status !== "paid" && p.approval === "approved" && (
                        <button className="icon-btn" title="Record payment (full / partial)" onClick={() => setRecord(p)}><IndianRupee size={16} /></button>
                      )}
                      {role !== "rep" && p.status !== "paid" && p.approval === "approved" && (
                        <button className="icon-btn" title="Mark fully paid" onClick={() => markPaid(p.id)}><CheckCheck size={16} /></button>
                      )}
                      {p.type === "incoming" && (
                        <button className="icon-btn" title="Print invoice" onClick={() => printInvoice(p, customers.find((c) => c.id === p.customerId), products.find((x) => x.id === p.productId), settings)}><Printer size={16} /></button>
                      )}
                      {canEdit(p) && <button className="icon-btn" title="Edit" onClick={() => setEditing(p)}><Pencil size={16} /></button>}
                      {can(role, "payments:delete") && (
                        <button className="icon-btn" title="Delete" onClick={() => confirm(`Delete "${p.title}"?`) && deletePayment(p.id)}><Trash2 size={16} /></button>
                      )}
                      {can(role, "payments:request_delete") && !p.deleteRequested && (
                        <button className="icon-btn" title="Request deletion" onClick={() => confirm("Ask Admin to delete this entry?") && requestDelete(p.id)}><Flag size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={7} className="empty">No payments match your filters.</td></tr>}
          </tbody>
        </table>
      </div>

      {remind && <ReminderModal payment={remind} onClose={() => setRemind(null)} />}
      {record && <RecordPaymentModal payment={record} onClose={() => setRecord(null)} />}
      {follow && <FollowUpModal payment={follow} onClose={() => setFollow(null)} />}
      {creating && <PaymentForm onClose={() => setCreating(false)} />}
      {editing && <PaymentForm payment={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
