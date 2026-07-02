import {
  Compass, Inbox, Handshake, CheckCircle2, FolderKanban, Lock,
  TrendingUp, Users, FileStack, FileKey2, BarChart3, Home, Calendar, Bookmark
} from 'lucide-react';

export const PUBLIC_NAV = [
  { label: 'Discover IP', to: '/discover', match: '/discover' },
  { label: 'About Us', to: '/about', match: '/about' },
  { label: 'How It Works', to: '/how-it-works', match: '/how-it-works' },
  { label: 'Pricing', to: '/pricing', match: '/pricing' },
] as const;

export const BUYER_NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: Home },
  { label: 'Meetings', path: '/dashboard/meetings', icon: Calendar },
  { label: 'My Requests', path: '/dashboard/requests', icon: Inbox },
  { label: 'Active Deals', path: '/dashboard/deals', icon: Handshake },
  { label: 'Saved IP', path: '/dashboard/saved', icon: Bookmark },
  { label: 'Completed Deals', path: '/dashboard/deals/completed', icon: CheckCircle2 },
  { label: 'Discover', path: '/discover', icon: Compass },
];

export const INVENTOR_NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: Home },
  { label: 'My IP Assets', path: '/dashboard/assets', icon: FolderKanban },
  { label: 'Access Requests', path: '/dashboard/access-requests', icon: Lock },
  { label: 'Meetings', path: '/dashboard/meetings', icon: Calendar },
  { label: 'Active Negotiations', path: '/dashboard/negotiations', icon: Handshake },
  { label: 'Revenue', path: '/dashboard/revenue', icon: TrendingUp },
];

export const ADMIN_NAV = [
  { label: 'Users', path: '/dashboard/users', icon: Users },
  { label: 'IP Listings', path: '/dashboard/listings', icon: FileStack },
  { label: 'Deals', path: '/dashboard/deals', icon: Handshake },
  { label: 'Escrow', path: '/dashboard/escrow', icon: FileKey2 },
  { label: 'Reports', path: '/dashboard/reports', icon: BarChart3 },
];

export function getDashboardNav(role: string) {
  if (role === 'buyer') return BUYER_NAV;
  if (role === 'owner') return INVENTOR_NAV;
  if (role === 'admin') return ADMIN_NAV;
  return [{ label: 'Home', path: '/dashboard', icon: Home }];
}
