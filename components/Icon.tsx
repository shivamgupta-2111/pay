/**
 * ============================================================
 *  ICONS — the ONE place to change any icon in the app
 * ============================================================
 *
 *  Use anywhere:   <Icon name="whatsapp" size={16} />
 *
 *  To change an icon, pick ONE of these options:
 *
 *  1) Swap to another Lucide icon (1,500+ icons: https://lucide.dev/icons)
 *       import { Send } from "lucide-react";
 *       whatsapp: Send,
 *
 *  2) Use your own image file (SVG / PNG / WEBP)
 *       - put the file in  /public/icons/   e.g. /public/icons/whatsapp.svg
 *       - add it to CUSTOM_ICONS below:
 *           whatsapp: "/icons/whatsapp.svg",                    // single colour, follows text colour
 *           whatsapp: { src: "/icons/wa.png", tint: false },     // keep the image's own colours
 *
 *  Custom files take priority over Lucide icons.
 */
import type { CSSProperties } from "react";
import {
  AlarmClockOff, AlertTriangle, ArrowUpRight, Bell, BellPlus, BellRing, Briefcase, CalendarCheck, CalendarClock, Check,
  CheckCheck, CheckCircle2, ChevronRight, Contact, Copy, Crown, Download, FileText, Flag, History, IndianRupee,
  LayoutDashboard, LogOut, Mail, MessageCircle, MessageSquare, NotebookPen, Package, Pause, Pencil, Phone, Play, Plus,
  Power, Printer, ReceiptText, Repeat, RotateCcw, ScrollText, Search, Settings, ShieldCheck, Target, Trash2, Undo2,
  UserCheck, UserX, Users, Wallet, X, XCircle,
} from "lucide-react";

export const ICONS = {
  // ---- navigation ----
  dashboard: LayoutDashboard,
  reminder: BellRing,
  approvals: CheckCircle2,
  subscription: Repeat,
  product: Package,
  customers: Contact,
  wallet: Wallet,
  users: Users,
  target: Target,
  audit: ScrollText,
  settings: Settings,
  logout: LogOut,
  reset: RotateCcw,
  bell: Bell,

  // ---- roles (login screen) ----
  ceo: Crown,
  admin: ShieldCheck,
  rep: Briefcase,

  // ---- reminder / contact channels ----
  whatsapp: MessageCircle,
  sms: MessageSquare,
  email: Mail,
  call: Phone,
  copy: Copy,
  alertsOn: BellPlus,
  snooze: AlarmClockOff,
  followUp: NotebookPen,

  // ---- payments ----
  rupee: IndianRupee,
  markPaid: CheckCheck,
  invoice: ReceiptText,
  print: Printer,
  statement: FileText,
  download: Download,

  // ---- generic actions ----
  add: Plus,
  edit: Pencil,
  delete: Trash2,
  search: Search,
  check: Check,
  close: X,
  cancel: XCircle,
  undo: Undo2,
  flag: Flag,
  history: History,
  power: Power,
  pause: Pause,
  resume: Play,
  userActivate: UserCheck,
  userDeactivate: UserX,
  chevronRight: ChevronRight,
  arrowUpRight: ArrowUpRight,

  // ---- status ----
  warning: AlertTriangle,
  calendarToday: CalendarCheck,
  calendarUpcoming: CalendarClock,
} as const;

export type IconName = keyof typeof ICONS;

/** Your own icon files from /public/icons — these override the Lucide icons above. */
export const CUSTOM_ICONS: Partial<Record<IconName, string | { src: string; tint?: boolean }>> = {
  whatsapp: "/icons/whatsapp.svg",
};

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export function Icon({ name, size = 18, color, strokeWidth = 2, className = "", style, title }: Props) {
  const custom = CUSTOM_ICONS[name];

  if (custom) {
    const { src, tint = true } = typeof custom === "string" ? { src: custom } : custom;
    if (!tint) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} width={size} height={size} alt={title ?? ""} className={`app-icon ${className}`} style={{ objectFit: "contain", flexShrink: 0, ...style }} />;
    }
    // tinted: the file's shape is painted in the current text colour (or `color`)
    return (
      <span
        role={title ? "img" : undefined}
        aria-label={title}
        aria-hidden={title ? undefined : true}
        className={`app-icon ${className}`}
        style={{
          display: "inline-block", width: size, height: size, flexShrink: 0, backgroundColor: color ?? "currentColor",
          WebkitMask: `url(${src}) center / contain no-repeat`, mask: `url(${src}) center / contain no-repeat`, ...style,
        }}
      />
    );
  }

  const Lucide = ICONS[name];
  return <Lucide size={size} color={color} strokeWidth={strokeWidth} className={`app-icon ${className}`} style={style} aria-hidden={title ? undefined : true} aria-label={title} />;
}
