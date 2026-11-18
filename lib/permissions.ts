import type { Role } from "./types";

export type Permission =
  | "payments:view_all"
  | "payments:view_own"
  | "payments:create"
  | "payments:edit_any"
  | "payments:edit_own_pending"
  | "payments:delete"
  | "payments:request_delete"
  | "payments:mark_paid"
  | "payments:approve_limited"
  | "payments:approve_any"
  | "users:manage_reps"
  | "targets:set"
  | "limits:set"
  | "audit:view"
  | "settings:manage"
  | "reports:all"
  | "reports:own";

/** Single source of truth for what each role can do */
export const PERMISSIONS: Record<Role, Permission[]> = {
  ceo: [
    "payments:view_all",
    "payments:create",
    "payments:edit_any",
    "payments:delete",
    "payments:mark_paid",
    "payments:approve_any",
    "targets:set",
    "limits:set",
    "audit:view",
    "reports:all",
  ],
  admin: [
    "payments:view_all",
    "payments:create",
    "payments:edit_any",
    "payments:delete",
    "payments:mark_paid",
    "payments:approve_limited",
    "users:manage_reps",
    "settings:manage",
    "reports:all",
  ],
  rep: [
    "payments:view_own",
    "payments:create",
    "payments:edit_own_pending",
    "payments:request_delete",
    "reports:own",
  ],
};

export const can = (role: Role | undefined, perm: Permission) =>
  !!role && PERMISSIONS[role].includes(perm);

export const ROLE_LABEL: Record<Role, string> = {
  ceo: "CEO",
  admin: "Admin",
  rep: "Sales Rep",
};
