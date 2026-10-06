export type OrgRole = 'owner' | 'admin' | 'member' | 'analyst';

export const ROLE_RANK: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  analyst: 1,
};

/** Permission matrix — backend is authoritative */
export const PERMISSIONS = {
  'org:manage': ['owner'] as OrgRole[],
  'org:members': ['owner', 'admin'] as OrgRole[],
  'org:delete': ['owner'] as OrgRole[],
  'product:create': ['owner', 'admin'] as OrgRole[],
  'product:update': ['owner', 'admin'] as OrgRole[],
  'product:delete': ['owner', 'admin'] as OrgRole[],
  'product:read': ['owner', 'admin', 'member', 'analyst'] as OrgRole[],
  'feedback:read': ['owner', 'admin', 'member', 'analyst'] as OrgRole[],
  'feedback:delete': ['owner', 'admin'] as OrgRole[],
  'analytics:read': ['owner', 'admin', 'member', 'analyst'] as OrgRole[],
  'brief:read': ['owner', 'admin', 'member', 'analyst'] as OrgRole[],
  'settings:update': ['owner', 'admin'] as OrgRole[],
  'public_link:manage': ['owner', 'admin'] as OrgRole[],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function roleHasPermission(role: OrgRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly OrgRole[]).includes(role);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
