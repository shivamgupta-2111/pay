# PayTrack – Subscription Payment Tracker (Next.js, frontend only)

Track subscription customers, auto-generate invoices every billing cycle and never forget a payment reminder.
Portals for **CEO**, **Admin** and **Sales Rep**. All data is stored in the browser (localStorage) — no backend needed.

## Run
```bash
npm install
npm run dev        # http://localhost:3000 → pick a portal on the login screen
```

## How it works
1. **Products** (CEO/Admin) – plans you sell: price, billing cycle (monthly / quarterly / half-yearly / yearly), GST.
2. **Customers** – company, contact person, WhatsApp number, email, assigned rep.
3. **Subscriptions** – customer + product + price + first invoice date.
4. **Auto-billing** – every time the app opens, invoices are created for each active subscription
   `lookaheadDays` (default 7) before the due date.
5. **Reminders** – a schedule decides who needs a reminder today:
   - N days before due (default 7, 3, 1), on the due date, then every N days while overdue (default 2)
   - paused by a **promise-to-pay date** or **snooze**
6. Payments are recorded (full or partial). Reps' collections go to Admin for **verification**.

## Reminder actions
| Action | What it does |
|---|---|
| Remind | Pre-filled message (upcoming / due / overdue template), editable, send via **WhatsApp, SMS, Email, Call** or **Copy** – every send is logged |
| Quick WhatsApp | One click opens WhatsApp with the right message and logs it |
| Call | Opens the dialer and asks you to log the outcome |
| Follow-up | Quick notes ("No answer", "Will pay this week"…) + promise-to-pay date |
| Record payment | Full / half / custom amount, method, UTR reference, date |
| Snooze | 1 / 3 / 7 days |
| Print invoice | Printable invoice with GST and UPI ID |
| Bulk | Copy all messages, mark reminded, snooze 3 days |
| Statement | Send a customer's full outstanding statement on WhatsApp |
| Desktop alerts | Browser notification with today's reminder count |

## Powers
| Feature | CEO | Admin | Rep |
|---|:-:|:-:|:-:|
| Products: add / edit / duplicate / deactivate / delete | ✅ | ✅ | ❌ |
| Customers | all | all + reassign rep | own (add/edit) |
| Subscriptions: create | ✅ | ✅ | own customers |
| Subscriptions: edit price, pause, resume, cancel, bill now | ✅ | ✅ | ❌ |
| Reminders & follow-ups | all | all | own |
| Record payment | ✅ | ✅ | ✅ (needs verification) |
| Approve / verify | any amount | up to limit, else → CEO | ❌ |
| Reminder schedule & message templates | ✅ | ✅ | ❌ |
| Approval limit, rep targets, audit log | ✅ | ❌ | ❌ |
| Manage reps, categories, payment methods | ❌ | ✅ | ❌ |

Edit `lib/permissions.ts` to change any of these.

## Changing the main logo
Put your logo file in `public/` (PNG, SVG, JPG or WEBP) and set the path in **`components/Logo.tsx`**:
```ts
export const LOGO_SRC = "/logo.png";
export const SHOW_NAME = false;   // if your logo already contains the company name
```
It's used on the sidebar, the login screen and the browser-tab icon.

## Changing icons
All icons live in **one file: `components/Icon.tsx`**. Every screen uses `<Icon name="…" />`.

- **Another built-in icon** – pick one at https://lucide.dev/icons, import it and change the line, e.g. `whatsapp: Send,`
- **Your own file** – drop it in `public/icons/` and add it to `CUSTOM_ICONS`:
  ```ts
  whatsapp: "/icons/whatsapp.svg",                    // single colour – follows text/button colour
  whatsapp: { src: "/icons/wa.png", tint: false },    // keeps the image's own colours
  ```
  (`whatsapp` is already set up this way as a working example.)

## Structure
```
app/{ceo,admin,rep}/…            routes (reminders, subscriptions, products, customers, payments, …)
components/
  RemindersView.tsx               reminder centre (tabs, bulk, actions)
  PaymentActions.tsx              Remind / Record payment / Follow-up modals
  CatalogViews.tsx                Products, Subscriptions, Customers (+ statement)
  ReminderSettings.tsx            schedule + templates with live preview
  DashboardView, PaymentsView, ApprovalsView, AdminViews, PortalShell, Charts, ui
lib/
  billing.ts                      cycles, invoice generation, reminder schedule, templates, WhatsApp/SMS links, print
  permissions.ts · types.ts · format.ts · mockData.ts
store/useStore.ts                 Zustand store with all actions
```

> Frontend only: WhatsApp/SMS/email open the app on your device with the message ready — you press send.
> For fully automatic sending you'll need a backend + WhatsApp Business API / SMS gateway.
