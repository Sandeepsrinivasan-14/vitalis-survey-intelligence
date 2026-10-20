/** Edge-safe role definitions (imported by middleware, so no Node APIs here). */

export const ROLES = ['facility', 'district', 'state', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  facility: 'Facility Manager',
  district: 'District Officer',
  state: 'State Admin',
  admin: 'Website Manager (IT)',
};

export const ROLE_HOME: Record<Role, string> = {
  facility: '/facility/dashboard',
  district: '/district/dashboard',
  state: '/state/dashboard',
  admin: '/admin/dashboard',
};

/**
 * Which dashboards a role may open. Officers can look "down" the hierarchy
 * (a state admin may open district and facility views); the IT role is
 * deliberately limited to its own page (least privilege).
 */
const ACCESS: Record<Role, Role[]> = {
  facility: ['facility'],
  district: ['district', 'facility'],
  state: ['state', 'district', 'facility'],
  admin: ['admin'],
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** Maps a pathname to the role whose dashboard it is, or null if unprotected. */
export function roleForPath(pathname: string): Role | null {
  const segment = pathname.split('/')[1];
  return isRole(segment) ? segment : null;
}

export function canAccess(role: Role, target: Role): boolean {
  return ACCESS[role].includes(target);
}

/** Only allow same-site relative redirects after login (prevents open redirects). */
export function safeNextPath(next: string | null | undefined, role: Role): string {
  if (next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) {
    const target = roleForPath(next);
    if (target && canAccess(role, target)) return next;
  }
  return ROLE_HOME[role];
}
