import type { Role } from "./types";

export type Permission =
  | "payments:view_all"
  | "payments:create"
  | "payments:edit_any"
  | "payments:edit_own_pending"
  | "payments:delete"
  | "payments:request_delete"
  | "payments:record" // record a (partial) payment received
  | "payments:approve_limited"
  | "payments:approve_any"
  | "products:manage"
  | "customers:view_all"
  | "customers:create"
  | "customers:manage" // edit any customer, reassign rep
  | "subscriptions:create"
  | "subscriptions:manage" // edit price, pause, resume, cancel
  | "reminders:configure"
  | "users:manage_reps"
  | "targets:set"
  | "limits:set"
  | "audit:view"
  | "settings:manage"
  | "reports:all";

/** Single source of truth for what each role can do */
export const PERMISSIONS: Record<Role, Permission[]> = {
  ceo: [
    "payments:view_all", "payments:create", "payments:edit_any", "payments:delete", "payments:record", "payments:approve_any",
    "products:manage",
    "customers:view_all", "customers:create", "customers:manage",
    "subscriptions:create", "subscriptions:manage",
    "reminders:configure",
    "targets:set", "limits:set", "audit:view", "reports:all",
  ],
  admin: [
    "payments:view_all", "payments:create", "payments:edit_any", "payments:delete", "payments:record", "payments:approve_limited",
    "products:manage",
    "customers:view_all", "customers:create", "customers:manage",
    "subscriptions:create", "subscriptions:manage",
    "reminders:configure",
    "users:manage_reps", "settings:manage", "reports:all",
  ],
  rep: [
    "payments:create", "payments:edit_own_pending", "payments:request_delete", "payments:record",
    "customers:create",
    "subscriptions:create",
  ],
};

export const can = (role: Role | undefined, perm: Permission) => !!role && PERMISSIONS[role].includes(perm);

export const ROLE_LABEL: Record<Role, string> = { ceo: "CEO", admin: "Admin", rep: "Sales Rep" };
