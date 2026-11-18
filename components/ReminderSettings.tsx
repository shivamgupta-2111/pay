"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import type { Payment, TemplateKind } from "@/lib/types";
import { addDays, todayISO } from "@/lib/format";
import { TEMPLATE_VARS, fillTemplate } from "@/lib/billing";

const KINDS: [TemplateKind, string][] = [["upcoming", "Before due date"], ["due", "On due date"], ["overdue", "Overdue"]];

export function ReminderSettings() {
  const { settings, updateSettings, payments, customers, products } = useStore();
  const [f, setF] = useState({
    companyName: settings.companyName,
    upiId: settings.upiId,
    reminderDays: settings.reminderDays.join(", "),
    overdueEvery: String(settings.overdueEvery),
    lookaheadDays: String(settings.lookaheadDays),
    templates: { ...settings.templates },
  });
  const [kind, setKind] = useState<TemplateKind>("upcoming");
  const [saved, setSaved] = useState(false);

  // sample invoice for live preview
  const sample: Payment = useMemo(() => {
    const p = payments.find((x) => x.subscriptionId) ?? payments[0];
    const d = kind === "upcoming" ? 3 : kind === "due" ? 0 : -5;
    return { ...p, dueDate: addDays(todayISO(), d), paidAmount: 0 };
  }, [payments, kind]);
  const preview = fillTemplate(f.templates[kind], sample, {
    customer: customers.find((c) => c.id === sample?.customerId),
    product: products.find((p) => p.id === sample?.productId),
    settings: { ...settings, companyName: f.companyName, upiId: f.upiId },
  });

  const save = () => {
    const days = f.reminderDays.split(/[,\s]+/).map(Number).filter((n) => n > 0).sort((a, b) => b - a);
    updateSettings({
      companyName: f.companyName.trim(),
      upiId: f.upiId.trim(),
      reminderDays: days.length ? days : [3],
      overdueEvery: Math.max(1, Number(f.overdueEvery) || 2),
      lookaheadDays: Math.max(0, Number(f.lookaheadDays) || 0),
      templates: f.templates,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="card">
      <div className="card-title">Payment reminders</div>
      <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="field"><label>Company name (in messages)</label><input className="input" value={f.companyName} onChange={(e) => setF({ ...f, companyName: e.target.value })} /></div>
        <div className="field"><label>UPI ID</label><input className="input" value={f.upiId} onChange={(e) => setF({ ...f, upiId: e.target.value })} /></div>
        <div className="field"><label>Remind days before due</label><input className="input" value={f.reminderDays} onChange={(e) => setF({ ...f, reminderDays: e.target.value })} placeholder="7, 3, 1" /></div>
        <div className="field"><label>When overdue, remind every (days)</label><input className="input" type="number" min={1} value={f.overdueEvery} onChange={(e) => setF({ ...f, overdueEvery: e.target.value })} /></div>
        <div className="field"><label>Create invoices (days before due)</label><input className="input" type="number" min={0} value={f.lookaheadDays} onChange={(e) => setF({ ...f, lookaheadDays: e.target.value })} /></div>
      </div>

      <div className="seg" style={{ margin: "20px 0 10px" }}>
        {KINDS.map(([k, l]) => <button key={k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{l}</button>)}
      </div>
      <div className="grid grid-eq">
        <div className="field">
          <label>Message template</label>
          <textarea className="textarea" rows={9} value={f.templates[kind]} onChange={(e) => setF({ ...f, templates: { ...f.templates, [kind]: e.target.value } })} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TEMPLATE_VARS.map((v) => (
              <button key={v} className="chip" onClick={() => setF({ ...f, templates: { ...f.templates, [kind]: f.templates[kind] + `{${v}}` } })}>{`{${v}}`}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Preview</label>
          <div className="wa-preview">{preview}</div>
        </div>
      </div>
      <div className="modal-foot">
        {saved && <span className="muted" style={{ alignSelf: "center" }}>Saved ✓</span>}
        <button className="btn btn-primary" onClick={save}>Save reminder settings</button>
      </div>
    </div>
  );
}
