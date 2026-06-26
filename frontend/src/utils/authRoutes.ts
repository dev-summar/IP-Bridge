export type UserRole = 'admin' | 'owner' | 'buyer';

/** Default landing page after login — buyers discover patents first, not the ops dashboard. */
export function getHomePathForRole(role: UserRole): string {
  if (role === 'buyer') return '/marketplace';
  return '/dashboard';
}
