# PayTrack – Payment Tracker (Next.js, frontend only)

Role-based payment tracker with **CEO**, **Admin** and **Sales Rep** portals.
All data lives in the browser (localStorage via Zustand `persist`); no backend required.

## Run

```bash
npm install
npm run dev
# open http://localhost:3000  → choose a portal on the login screen
```

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Zustand · Recharts · lucide-react · plain CSS with your brand variables (`app/globals.css`).

## Portals & powers

| Feature | CEO | Admin | Rep |
|---|:-:|:-:|:-:|
| View all payments | ✅ | ✅ | own only |
| Add payment | ✅ auto-approved | ✅ (above limit → CEO) | ✅ → Admin review |
| Edit payment | ✅ | ✅ | own, while awaiting Admin |
| Delete payment | ✅ | ✅ | request only |
| Mark as paid | ✅ | ✅ | ❌ |
| Approve | any amount | up to limit, else forward to CEO | ❌ |
| Manage reps (add/edit/deactivate) | ❌ | ✅ | ❌ |
| Set rep targets | ✅ | ❌ | ❌ |
| Set Admin approval limit / currency | ✅ | ❌ | ❌ |
| Categories & payment methods | ❌ | ✅ | ❌ |
| Audit log | ✅ | ❌ | ❌ |
| Export CSV | ✅ | ✅ | own data |

### Approval flow
```
Rep submits ─► Awaiting Admin ─► amount ≤ limit ─► Approved / Rejected (with reason)
                               └► amount > limit ─► Awaiting CEO ─► Approved / Rejected
```

## Project structure
```
app/
  login/                 demo login (pick a role)
  ceo/      overview · approvals · payments · team · audit · settings
  admin/    dashboard · approvals · payments · users · settings
  rep/      dashboard · payments · customers
components/
  PortalShell.tsx        sidebar + topbar + role guard (redirects wrong roles)
  DashboardView.tsx      role-aware dashboard (stats, charts, upcoming)
  PaymentsView.tsx       table with search/filters/export + permission-based actions
  PaymentForm.tsx        add/edit modal
  ApprovalsView.tsx      approval queue + deletion requests
  AdminViews.tsx         Users, Settings, Team & Targets, Audit log, Customers
  Charts.tsx             Recharts (monthly, category, rep performance)
  ui.tsx                 StatCard, badges, Modal, Progress, <Can> guard
lib/
  permissions.ts         ROLE → permissions map + can()
  types.ts · format.ts · mockData.ts
store/useStore.ts        Zustand store: auth, payments, users, audit, settings
```

## Changing permissions
Edit `PERMISSIONS` in `lib/permissions.ts` – buttons and actions read from it via `can(role, "perm")` or `<Can perm="...">`.

> ⚠️ Frontend-only role checks are for demos/prototypes. When you add a backend, enforce the same rules on the server.
