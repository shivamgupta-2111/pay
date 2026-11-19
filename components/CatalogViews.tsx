"use client";
import { Icon } from "@/components/Icon";
import { useMemo, useState } from "react";
import { useMe, useStore } from "@/store/useStore";
import { can } from "@/lib/permissions";
import type { Customer, Cycle, Payment, Product, Subscription } from "@/lib/types";
import { addDays, balance, effectiveStatus, fmtDate, money, todayISO } from "@/lib/format";
import { CYCLE_LABEL, CYCLE_SHORT, isRemindable, mrrOf, telLink, waLink } from "@/lib/billing";
import { Modal, StatCard, StatusBadge } from "./ui";
import { ReminderModal } from "./PaymentActions";

const CYCLES: Cycle[] = ["monthly", "quarterly", "half_yearly", "yearly"];

/* =========================================================
   PRODUCTS  (CEO + Admin)
   ========================================================= */
export function ProductsView() {
  const me = useMe()!;
  const { products, subscriptions, settings, saveProduct, deleteProduct } = useStore();
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [q, setQ] = useState("");
  const manage = can(me.role, "products:manage");

  const stats = (id: string) => {
    const subs = subscriptions.filter((s) => s.productId === id && s.status === "active");
    return { count: subs.length, mrr: subs.reduce((a, s) => a + mrrOf(s), 0), any: subscriptions.some((s) => s.productId === id) };
  };
  const list = products.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="toolbar">
        <div className="search"><Icon name="search" size={16} /><input className="input" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {manage && <button className="btn btn-primary" onClick={() => setEditing({ cycle: "monthly", taxRate: 18, active: true })}><Icon name="add" size={16} /> Add product</button>}
      </div>
      <div className="product-grid">
        {list.map((p) => {
          const st = stats(p.id);
          return (
            <div key={p.id} className={`card product ${p.active ? "" : "inactive"}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                  <div className="muted">{p.sku ? `${p.sku} · ` : ""}GST {p.taxRate}%</div>
                </div>
                <span className={`badge ${p.active ? "b-green" : "b-grey"}`}>{p.active ? "Active" : "Inactive"}</span>
              </div>
              <div className="price">{money(p.price, settings.currency)} <small>{CYCLE_SHORT[p.cycle]} · {CYCLE_LABEL[p.cycle]}</small></div>
              <div className="muted" style={{ minHeight: 34 }}>{p.description}</div>
              <div className="meta">
                <div><b>{st.count}</b>subscribers</div>
                <div><b>{money(st.mrr, settings.currency)}</b>MRR</div>
                {manage && (
                  <div className="actions" style={{ marginLeft: "auto", alignItems: "center" }}>
                    <button className="icon-btn" title="Edit" onClick={() => setEditing(p)}><Icon name="edit" size={16} /></button>
                    <button className="icon-btn" title="Duplicate" onClick={() => setEditing({ ...p, id: undefined, name: `${p.name} (copy)`, sku: `${p.sku}-2` })}><Icon name="copy" size={16} /></button>
                    <button className="icon-btn" title={p.active ? "Deactivate" : "Activate"} onClick={() => saveProduct({ ...p, active: !p.active })}><Icon name="power" size={16} /></button>
                    <button
                      className="icon-btn" title={st.any ? "Has subscriptions – deactivate instead" : "Delete"} disabled={st.any}
                      onClick={() => confirm(`Delete ${p.name}?`) && deleteProduct(p.id)}
                    ><Icon name="delete" size={16} /></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {editing && <ProductForm product={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function ProductForm({ product, onClose }: { product: Partial<Product>; onClose: () => void }) {
  const saveProduct = useStore((s) => s.saveProduct);
  const [f, setF] = useState({
    name: product.name ?? "", sku: product.sku ?? "", description: product.description ?? "",
    price: String(product.price ?? ""), cycle: product.cycle ?? "monthly", taxRate: String(product.taxRate ?? 18), active: product.active ?? true,
  });
  const valid = f.name.trim() && Number(f.price) > 0;
  return (
    <Modal title={product.id ? "Edit product" : "Add product"} onClose={onClose}>
      <div className="form-grid">
        <div className="field full"><label>Product / plan name *</label><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Water Purifier AMC" /></div>
        <div className="field"><label>SKU / code</label><input className="input" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} /></div>
        <div className="field"><label>Price (incl. tax) *</label><input className="input" type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
        <div className="field">
          <label>Billing cycle</label>
          <select className="select" value={f.cycle} onChange={(e) => setF({ ...f, cycle: e.target.value as Cycle })}>{CYCLES.map((c) => <option key={c} value={c}>{CYCLE_LABEL[c]}</option>)}</select>
        </div>
        <div className="field"><label>GST %</label><input className="input" type="number" value={f.taxRate} onChange={(e) => setF({ ...f, taxRate: e.target.value })} /></div>
        <div className="field full"><label>Description</label><textarea className="textarea" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Available for new subscriptions</label>
      </div>
      {product.id && <p className="muted" style={{ marginTop: 12 }}>Price changes apply to new subscriptions. Existing subscriptions keep their price (edit them individually).</p>}
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => {
          saveProduct({ id: product.id, name: f.name.trim(), sku: f.sku.trim(), description: f.description.trim(), price: Number(f.price), cycle: f.cycle as Cycle, taxRate: Number(f.taxRate) || 0, active: f.active });
          onClose();
        }}>Save product</button>
      </div>
    </Modal>
  );
}

/* =========================================================
   SUBSCRIPTIONS
   ========================================================= */
export function SubscriptionsView() {
  const me = useMe()!;
  const { subscriptions, customers, products, users, settings, setSubStatus, billNow } = useStore();
  const cur = settings.currency;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [prod, setProd] = useState("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<Subscription | null>(null);
  const [cancelling, setCancelling] = useState<Subscription | null>(null);
  const manage = can(me.role, "subscriptions:manage");

  const scoped = me.role === "rep" ? subscriptions.filter((s) => s.repId === me.id) : subscriptions;
  const cName = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";
  const pName = (id: string) => products.find((p) => p.id === id)?.name ?? "—";
  const rName = (id: string) => users.find((u) => u.id === id)?.name ?? "—";

  const rows = scoped
    .filter((s) => (status === "all" || s.status === status) && (prod === "all" || s.productId === prod))
    .filter((s) => !q || `${cName(s.customerId)} ${pName(s.productId)}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

  const active = scoped.filter((s) => s.status === "active");
  const week = addDays(todayISO(), 7);
  const renewals = active.filter((s) => s.nextDueDate <= addDays(week, settings.lookaheadDays));

  return (
    <>
      <div className="grid grid-4">
        <StatCard dark label="Monthly recurring revenue" value={money(active.reduce((a, s) => a + mrrOf(s), 0), cur)} hint={`ARR ${money(active.reduce((a, s) => a + mrrOf(s), 0) * 12, cur)}`} icon={<Icon name="subscription" size={20} />} />
        <StatCard label="Active subscriptions" value={String(active.length)} hint={`${new Set(active.map((s) => s.customerId)).size} customers`} />
        <StatCard label="Next invoices (2 wks)" value={String(renewals.length)} hint={money(renewals.reduce((a, s) => a + s.price, 0), cur)} />
        <StatCard label="Paused / cancelled" value={`${scoped.filter((s) => s.status === "paused").length} / ${scoped.filter((s) => s.status === "cancelled").length}`} hint="Churn watch" />
      </div>

      <div className="card mt">
        <div className="toolbar">
          <div className="search"><Icon name="search" size={16} /><input className="input" placeholder="Search customer or product…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All status</option><option value="active">Active</option><option value="paused">Paused</option><option value="cancelled">Cancelled</option>
          </select>
          <select className="select" value={prod} onChange={(e) => setProd(e.target.value)}>
            <option value="all">All products</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {can(me.role, "subscriptions:create") && <button className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="add" size={16} /> New subscription</button>}
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Product</th><th>Price</th><th>Started</th><th>Next invoice</th><th>Status</th>{me.role !== "rep" && <th>Rep</th>}<th style={{ textAlign: "right" }}>Actions</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{cName(s.customerId)}</td>
                  <td>{pName(s.productId)}</td>
                  <td><b>{money(s.price, cur)}</b><span className="muted"> {CYCLE_SHORT[s.cycle]}</span></td>
                  <td className="muted">{fmtDate(s.startDate)}</td>
                  <td>{s.status === "active" ? fmtDate(s.nextDueDate) : <span className="muted">—</span>}</td>
                  <td>
                    <span className={`badge ${s.status === "active" ? "b-green" : s.status === "paused" ? "b-orange" : "b-grey"}`}>{s.status}</span>
                    {s.cancelReason && <div className="muted">{s.cancelReason}</div>}
                  </td>
                  {me.role !== "rep" && <td>{rName(s.repId)}</td>}
                  <td>
                    <div className="actions">
                      <button className="icon-btn" title="Invoices & history" onClick={() => setHistory(s)}><Icon name="history" size={16} /></button>
                      {manage && s.status === "active" && <button className="icon-btn" title="Generate next invoice now" onClick={() => confirm(`Create invoice for ${fmtDate(s.nextDueDate)} now?`) && billNow(s.id)}><Icon name="invoice" size={16} /></button>}
                      {manage && s.status !== "cancelled" && <button className="icon-btn" title="Edit price / cycle / rep" onClick={() => setEditing(s)}><Icon name="edit" size={16} /></button>}
                      {manage && s.status === "active" && <button className="icon-btn" title="Pause" onClick={() => setSubStatus(s.id, "paused")}><Icon name="pause" size={16} /></button>}
                      {manage && s.status === "paused" && <button className="icon-btn" title="Resume" onClick={() => setSubStatus(s.id, "active")}><Icon name="resume" size={16} /></button>}
                      {manage && s.status !== "cancelled" && <button className="icon-btn" title="Cancel" onClick={() => setCancelling(s)}><Icon name="cancel" size={16} /></button>}
                      {manage && s.status === "cancelled" && <button className="btn btn-sm" onClick={() => setSubStatus(s.id, "active")}>Reactivate</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={8} className="empty">No subscriptions.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {creating && <SubscriptionForm onClose={() => setCreating(false)} />}
      {editing && <SubscriptionForm sub={editing} onClose={() => setEditing(null)} />}
      {history && <SubHistory sub={history} onClose={() => setHistory(null)} />}
      {cancelling && <CancelModal sub={cancelling} onClose={() => setCancelling(null)} />}
    </>
  );
}

export function SubscriptionForm({ sub, customerId, onClose }: { sub?: Subscription; customerId?: string; onClose: () => void }) {
  const me = useMe()!;
  const { customers, products, users, settings, addSubscription, updateSubscription } = useStore();
  const myCustomers = me.role === "rep" ? customers.filter((c) => c.repId === me.id) : customers;
  const reps = users.filter((u) => u.role === "rep" && u.active);
  const activeProducts = products.filter((p) => p.active || p.id === sub?.productId);
  const first = activeProducts[0];
  const [f, setF] = useState({
    customerId: sub?.customerId ?? customerId ?? myCustomers[0]?.id ?? "",
    productId: sub?.productId ?? first?.id ?? "",
    price: String(sub?.price ?? first?.price ?? ""),
    cycle: (sub?.cycle ?? first?.cycle ?? "monthly") as Cycle,
    startDate: sub?.nextDueDate ?? todayISO(),
    repId: sub?.repId ?? customers.find((c) => c.id === (customerId ?? myCustomers[0]?.id))?.repId ?? reps[0]?.id ?? "",
  });
  const pickProduct = (id: string) => {
    const p = products.find((x) => x.id === id);
    setF({ ...f, productId: id, price: String(p?.price ?? f.price), cycle: p?.cycle ?? f.cycle });
  };
  const pickCustomer = (id: string) => setF({ ...f, customerId: id, repId: customers.find((c) => c.id === id)?.repId ?? f.repId });
  const valid = f.customerId && f.productId && Number(f.price) > 0;

  return (
    <Modal title={sub ? "Edit subscription" : "New subscription"} onClose={onClose}>
      <div className="form-grid">
        <div className="field full">
          <label>Customer</label>
          <select className="select" value={f.customerId} disabled={!!sub} onChange={(e) => pickCustomer(e.target.value)}>
            {myCustomers.map((c) => <option key={c.id} value={c.id}>{c.name} – {c.city}</option>)}
          </select>
          {!myCustomers.length && <span className="muted">Add a customer first (Customers page).</span>}
        </div>
        <div className="field full">
          <label>Product / plan</label>
          <select className="select" value={f.productId} disabled={!!sub} onChange={(e) => pickProduct(e.target.value)}>
            {activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name} – {money(p.price, settings.currency)} {CYCLE_SHORT[p.cycle]}</option>)}
          </select>
        </div>
        <div className="field"><label>Price per cycle</label><input className="input" type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
        <div className="field">
          <label>Billing cycle</label>
          <select className="select" value={f.cycle} onChange={(e) => setF({ ...f, cycle: e.target.value as Cycle })}>{CYCLES.map((c) => <option key={c} value={c}>{CYCLE_LABEL[c]}</option>)}</select>
        </div>
        <div className="field">
          <label>{sub ? "Next invoice date" : "First invoice date"}</label>
          <input className="input" type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
        </div>
        {me.role !== "rep" && (
          <div className="field">
            <label>Rep</label>
            <select className="select" value={f.repId} onChange={(e) => setF({ ...f, repId: e.target.value })}>{reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          </div>
        )}
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        Invoices are created automatically {settings.lookaheadDays} days before each due date, and reminders follow your schedule.
      </p>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => {
          if (sub) updateSubscription(sub.id, { price: Number(f.price), cycle: f.cycle, nextDueDate: f.startDate, repId: f.repId });
          else addSubscription({ customerId: f.customerId, productId: f.productId, price: Number(f.price), cycle: f.cycle, startDate: f.startDate, repId: f.repId });
          onClose();
        }}>{sub ? "Save" : "Create subscription"}</button>
      </div>
    </Modal>
  );
}

function SubHistory({ sub, onClose }: { sub: Subscription; onClose: () => void }) {
  const { payments, customers, products, settings } = useStore();
  const inv = payments.filter((p) => p.subscriptionId === sub.id).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const paid = inv.reduce((a, p) => a + p.paidAmount, 0);
  const due = inv.reduce((a, p) => a + balance(p), 0);
  return (
    <Modal title={`${customers.find((c) => c.id === sub.customerId)?.name} · ${products.find((p) => p.id === sub.productId)?.name}`} onClose={onClose}>
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <StatCard label="Invoices" value={String(inv.length)} />
        <StatCard label="Collected" value={money(paid, settings.currency)} />
        <StatCard label="Outstanding" value={money(due, settings.currency)} />
      </div>
      <InvoiceTable rows={inv} />
    </Modal>
  );
}

function InvoiceTable({ rows }: { rows: Payment[] }) {
  const settings = useStore((s) => s.settings);
  const [remind, setRemind] = useState<Payment | null>(null);
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Invoice</th><th>Due</th><th>Amount</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td><div style={{ fontWeight: 600 }}>{p.invoiceNo ?? p.title}</div><div className="muted">{p.period ?? p.title}</div></td>
                <td className="muted">{fmtDate(p.dueDate)}</td>
                <td>{money(p.amount, settings.currency)}{p.paidAmount > 0 && p.status !== "paid" && <div className="muted">paid {money(p.paidAmount, settings.currency)}</div>}</td>
                <td><StatusBadge s={effectiveStatus(p)} /></td>
                <td style={{ textAlign: "right" }}>{isRemindable(p) ? <button className="btn btn-sm" onClick={() => setRemind(p)}>Remind</button> : p.approval !== "approved" && p.status !== "paid" ? <span className="muted">Awaiting approval</span> : null}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="empty">No invoices yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {remind && <ReminderModal payment={remind} onClose={() => setRemind(null)} />}
    </>
  );
}

function CancelModal({ sub, onClose }: { sub: Subscription; onClose: () => void }) {
  const setSubStatus = useStore((s) => s.setSubStatus);
  const [reason, setReason] = useState("");
  const reasons = ["Too expensive", "Switched to competitor", "No longer needed", "Business closed", "Poor service"];
  return (
    <Modal title="Cancel subscription" onClose={onClose}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>{reasons.map((r) => <button key={r} className="chip" onClick={() => setReason(r)}>{r}</button>)}</div>
      <div className="field"><label>Reason</label><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      <p className="muted" style={{ marginTop: 12 }}>Future unpaid invoices will be removed. Past dues stay open for collection.</p>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Keep subscription</button>
        <button className="btn btn-danger" disabled={!reason.trim()} onClick={() => { setSubStatus(sub.id, "cancelled", reason.trim()); onClose(); }}>Cancel subscription</button>
      </div>
    </Modal>
  );
}

/* =========================================================
   CUSTOMERS
   ========================================================= */
export function CustomersView() {
  const me = useMe()!;
  const { customers, subscriptions, payments, users, settings } = useStore();
  const cur = settings.currency;
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Customer> | null>(null);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [subFor, setSubFor] = useState<string | null>(null);

  const scoped = can(me.role, "customers:view_all") ? customers : customers.filter((c) => c.repId === me.id);
  const rows = useMemo(() => scoped
    .filter((c) => !q || `${c.name} ${c.contact} ${c.phone} ${c.city}`.toLowerCase().includes(q.toLowerCase()))
    .map((c) => {
      const subs = subscriptions.filter((s) => s.customerId === c.id && s.status === "active");
      const due = payments.filter((p) => p.customerId === c.id && isRemindable(p)).reduce((a, p) => a + balance(p), 0);
      const overdue = payments.some((p) => p.customerId === c.id && effectiveStatus(p) === "overdue");
      return { c, subs: subs.length, mrr: subs.reduce((a, s) => a + mrrOf(s), 0), due, overdue };
    })
    .sort((a, b) => b.due - a.due), [scoped, subscriptions, payments, q]);

  const canEdit = (c: Customer) => can(me.role, "customers:manage") || (c.repId === me.id && can(me.role, "customers:create"));

  return (
    <div className="card">
      <div className="toolbar">
        <div className="search"><Icon name="search" size={16} /><input className="input" placeholder="Search name, contact, phone, city…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {can(me.role, "customers:create") && <button className="btn btn-primary" onClick={() => setEditing({ repId: me.role === "rep" ? me.id : users.find((u) => u.role === "rep")?.id })}><Icon name="add" size={16} /> Add customer</button>}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Customer</th><th>Contact</th><th>Active plans</th><th>MRR</th><th>Outstanding</th>{me.role !== "rep" && <th>Rep</th>}<th style={{ textAlign: "right" }}>Actions</th></tr></thead>
          <tbody>
            {rows.map(({ c, subs, mrr, due, overdue }) => (
              <tr key={c.id}>
                <td><div style={{ fontWeight: 600 }}>{c.name}</div><div className="muted">{c.city}</div></td>
                <td><div>{c.contact}</div><div className="muted">{c.phone} · {c.email}</div></td>
                <td>{subs}</td>
                <td>{money(mrr, cur)}</td>
                <td style={{ fontWeight: 700, color: overdue ? "var(--red)" : due ? "var(--orange-dark)" : undefined }}>{money(due, cur)}</td>
                {me.role !== "rep" && <td>{users.find((u) => u.id === c.repId)?.name}</td>}
                <td>
                  <div className="actions">
                    <a className="icon-btn wa" title="WhatsApp" href={waLink(c.phone, `Hi ${c.contact}, `)} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={16} /></a>
                    <a className="icon-btn" title="Call" href={telLink(c.phone)}><Icon name="call" size={16} /></a>
                    <button className="icon-btn" title="Statement" onClick={() => setViewing(c)}><Icon name="statement" size={16} /></button>
                    {can(me.role, "subscriptions:create") && <button className="icon-btn" title="New subscription" onClick={() => setSubFor(c.id)}><Icon name="subscription" size={16} /></button>}
                    {canEdit(c) && <button className="icon-btn" title="Edit" onClick={() => setEditing(c)}><Icon name="edit" size={16} /></button>}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="empty">No customers yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {editing && <CustomerForm customer={editing} onClose={() => setEditing(null)} />}
      {viewing && <Statement customer={viewing} onClose={() => setViewing(null)} />}
      {subFor && <SubscriptionForm customerId={subFor} onClose={() => setSubFor(null)} />}
    </div>
  );
}

function CustomerForm({ customer, onClose }: { customer: Partial<Customer>; onClose: () => void }) {
  const me = useMe()!;
  const { users, saveCustomer } = useStore();
  const [f, setF] = useState({
    name: customer.name ?? "", contact: customer.contact ?? "", phone: customer.phone ?? "", email: customer.email ?? "",
    city: customer.city ?? "", repId: customer.repId ?? "", notes: customer.notes ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const valid = f.name.trim() && f.phone.replace(/\D/g, "").length >= 10;
  return (
    <Modal title={customer.id ? "Edit customer" : "Add customer"} onClose={onClose}>
      <div className="form-grid">
        <div className="field"><label>Customer / company *</label><input className="input" value={f.name} onChange={set("name")} /></div>
        <div className="field"><label>Contact person</label><input className="input" value={f.contact} onChange={set("contact")} /></div>
        <div className="field"><label>Phone (WhatsApp) *</label><input className="input" value={f.phone} onChange={set("phone")} placeholder="98XXXXXXXX" /></div>
        <div className="field"><label>Email</label><input className="input" value={f.email} onChange={set("email")} /></div>
        <div className="field"><label>City</label><input className="input" value={f.city} onChange={set("city")} /></div>
        {can(me.role, "customers:manage") && (
          <div className="field">
            <label>Assigned rep</label>
            <select className="select" value={f.repId} onChange={set("repId")}>{users.filter((u) => u.role === "rep").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
          </div>
        )}
        <div className="field full"><label>Notes</label><textarea className="textarea" rows={2} value={f.notes} onChange={set("notes")} /></div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => { saveCustomer({ ...f, id: customer.id, repId: f.repId || me.id }); onClose(); }}>Save</button>
      </div>
    </Modal>
  );
}

function Statement({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const { payments, subscriptions, products, settings, logReminder } = useStore();
  const cur = settings.currency;
  const inv = payments.filter((p) => p.customerId === customer.id && p.type === "incoming").sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const open = inv.filter(isRemindable);
  const total = open.reduce((a, p) => a + balance(p), 0);
  const subs = subscriptions.filter((s) => s.customerId === customer.id);

  const sendStatement = () => {
    const lines = open.map((p) => `• ${p.invoiceNo ?? p.title} (${p.period ?? fmtDate(p.dueDate)}) – ${money(balance(p), cur)}, due ${fmtDate(p.dueDate)}`).join("\n");
    const msg = `Hi ${customer.contact}, here is your account statement from ${settings.companyName}:\n\n${lines}\n\nTotal outstanding: ${money(total, cur)}\nPay via UPI: ${settings.upiId}\n\nThank you!`;
    window.open(waLink(customer.phone, msg), "_blank");
    if (open.length) logReminder(open.map((p) => p.id), "whatsapp");
  };

  return (
    <Modal title={`Statement – ${customer.name}`} onClose={onClose}>
      <div className="remind-head" style={{ marginBottom: 16 }}>
        <div><div style={{ fontWeight: 700 }}>{customer.contact}</div><div className="muted">{customer.phone} · {customer.email} · {customer.city}</div></div>
        <div style={{ textAlign: "right" }}><div className="muted">Outstanding</div><div style={{ fontSize: 20, fontWeight: 800 }}>{money(total, cur)}</div></div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {subs.map((s) => (
          <span key={s.id} className={`badge ${s.status === "active" ? "b-green" : "b-grey"}`}>
            {products.find((p) => p.id === s.productId)?.name} · {money(s.price, cur)}{CYCLE_SHORT[s.cycle]} · {s.status}
          </span>
        ))}
      </div>
      <button className="btn btn-wa" disabled={!open.length} onClick={sendStatement} style={{ marginBottom: 14 }}><Icon name="whatsapp" size={16} /> Send statement on WhatsApp</button>
      <InvoiceTable rows={inv} />
    </Modal>
  );
}
