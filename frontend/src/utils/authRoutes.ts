export type UserRole = 'admin' | 'owner' | 'buyer';

/** Default landing page after login */
export function getHomePathForRole(role: UserRole): string {
  if (role === 'buyer') return '/dashboard';
  return '/dashboard';
}

/** Where "List IP" should navigate based on role */
export function getListIPPath(role?: UserRole | null): string {
  if (role === 'owner' || role === 'admin') return '/dashboard/assets?new=1';
  return '/list-ip';
}
