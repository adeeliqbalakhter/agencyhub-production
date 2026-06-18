export type Role =
  | "super_admin"
  | "admin"
  | "agency_owner"
  | "agency_team_member"
  | "client"
  | "user";

export type Resource =
  | "users"
  | "agencies"
  | "reviews"
  | "leads"
  | "notifications"
  | "files"
  | "analytics"
  | "admin"
  | "billing"
  | "content"
  | "seo"
  | "team_members"
  | "agency_portfolio";

export type Action = "create" | "read" | "update" | "delete" | "manage" | "approve" | "moderate";

export interface Permission {
  resource: Resource;
  action: Action;
  condition?: "own" | "team" | "any";
}

const SUPER_ADMIN_PERMISSIONS: Permission[] = [
  { resource: "users", action: "manage", condition: "any" },
  { resource: "agencies", action: "manage", condition: "any" },
  { resource: "reviews", action: "manage", condition: "any" },
  { resource: "leads", action: "manage", condition: "any" },
  { resource: "notifications", action: "manage", condition: "any" },
  { resource: "files", action: "manage", condition: "any" },
  { resource: "analytics", action: "manage", condition: "any" },
  { resource: "admin", action: "manage", condition: "any" },
  { resource: "billing", action: "manage", condition: "any" },
  { resource: "content", action: "manage", condition: "any" },
  { resource: "seo", action: "manage", condition: "any" },
  { resource: "team_members", action: "manage", condition: "any" },
  { resource: "agency_portfolio", action: "manage", condition: "any" },
];

const ADMIN_PERMISSIONS: Permission[] = [
  { resource: "users", action: "read", condition: "any" },
  { resource: "users", action: "update", condition: "any" },
  { resource: "agencies", action: "read", condition: "any" },
  { resource: "agencies", action: "approve", condition: "any" },
  { resource: "agencies", action: "update", condition: "any" },
  { resource: "reviews", action: "read", condition: "any" },
  { resource: "reviews", action: "moderate", condition: "any" },
  { resource: "reviews", action: "approve", condition: "any" },
  { resource: "leads", action: "read", condition: "any" },
  { resource: "notifications", action: "manage", condition: "any" },
  { resource: "analytics", action: "read", condition: "any" },
  { resource: "admin", action: "read", condition: "any" },
  { resource: "content", action: "manage", condition: "any" },
  { resource: "seo", action: "manage", condition: "any" },
  { resource: "files", action: "manage", condition: "any" },
];

const AGENCY_OWNER_PERMISSIONS: Permission[] = [
  { resource: "agencies", action: "create", condition: "own" },
  { resource: "agencies", action: "read", condition: "own" },
  { resource: "agencies", action: "update", condition: "own" },
  { resource: "agencies", action: "delete", condition: "own" },
  { resource: "reviews", action: "read", condition: "own" },
  { resource: "leads", action: "read", condition: "own" },
  { resource: "leads", action: "update", condition: "own" },
  { resource: "team_members", action: "manage", condition: "own" },
  { resource: "agency_portfolio", action: "manage", condition: "own" },
  { resource: "analytics", action: "read", condition: "own" },
  { resource: "billing", action: "manage", condition: "own" },
  { resource: "notifications", action: "read", condition: "own" },
  { resource: "notifications", action: "update", condition: "own" },
  { resource: "files", action: "create", condition: "own" },
  { resource: "files", action: "read", condition: "own" },
  { resource: "files", action: "delete", condition: "own" },
];

const AGENCY_TEAM_MEMBER_PERMISSIONS: Permission[] = [
  { resource: "agencies", action: "read", condition: "team" },
  { resource: "agencies", action: "update", condition: "team" },
  { resource: "leads", action: "read", condition: "team" },
  { resource: "leads", action: "update", condition: "team" },
  { resource: "reviews", action: "read", condition: "team" },
  { resource: "analytics", action: "read", condition: "team" },
  { resource: "agency_portfolio", action: "create", condition: "team" },
  { resource: "agency_portfolio", action: "update", condition: "team" },
  { resource: "notifications", action: "read", condition: "own" },
  { resource: "files", action: "create", condition: "own" },
  { resource: "files", action: "read", condition: "team" },
];

const CLIENT_PERMISSIONS: Permission[] = [
  { resource: "agencies", action: "read", condition: "any" },
  { resource: "reviews", action: "create", condition: "own" },
  { resource: "reviews", action: "read", condition: "any" },
  { resource: "reviews", action: "update", condition: "own" },
  { resource: "reviews", action: "delete", condition: "own" },
  { resource: "leads", action: "create", condition: "own" },
  { resource: "leads", action: "read", condition: "own" },
  { resource: "notifications", action: "read", condition: "own" },
  { resource: "files", action: "create", condition: "own" },
  { resource: "files", action: "read", condition: "own" },
];

const USER_PERMISSIONS: Permission[] = [
  { resource: "agencies", action: "read", condition: "any" },
  { resource: "reviews", action: "read", condition: "any" },
  { resource: "notifications", action: "read", condition: "own" },
];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: SUPER_ADMIN_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  agency_owner: AGENCY_OWNER_PERMISSIONS,
  agency_team_member: AGENCY_TEAM_MEMBER_PERMISSIONS,
  client: CLIENT_PERMISSIONS,
  user: USER_PERMISSIONS,
};

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(
  role: Role,
  resource: Resource,
  action: Action,
  condition?: "own" | "team" | "any"
): boolean {
  const permissions = getRolePermissions(role);
  return permissions.some((p) => {
    if (p.resource !== resource) return false;
    if (p.action !== action && p.action !== "manage") return false;
    if (condition && p.condition !== "any" && p.condition !== condition) return false;
    return true;
  });
}

export function isAdmin(role: Role): boolean {
  return role === "super_admin" || role === "admin";
}

export function isSuperAdmin(role: Role): boolean {
  return role === "super_admin";
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  super_admin: 100,
  admin: 80,
  agency_owner: 60,
  agency_team_member: 40,
  client: 20,
  user: 10,
};

export function canManageRole(actorRole: Role, targetRole: Role): boolean {
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
}

export const DASHBOARD_ACCESS: Record<Role, string[]> = {
  super_admin: ["/admin", "/dashboard"],
  admin: ["/admin", "/dashboard"],
  agency_owner: ["/dashboard"],
  agency_team_member: ["/dashboard"],
  client: ["/dashboard"],
  user: [],
};
