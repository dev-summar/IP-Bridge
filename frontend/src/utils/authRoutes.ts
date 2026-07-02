export type UserRole = 'admin' | 'owner' | 'buyer';

/** Default landing page after login */
export function getHomePathForRole(role: UserRole): string {
  if (role === 'buyer') return '/dashboard';
  return '/dashboard';
}
