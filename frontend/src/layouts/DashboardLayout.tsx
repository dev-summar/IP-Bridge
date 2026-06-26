import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/authStore';
import { 
  Home, FolderKanban, Inbox, Calendar, Bookmark, 
  ShieldCheck, Users, Activity, FileKey2, LogOut, Handshake, Lock
} from 'lucide-react';
import { cn } from '../utils/cn';

export const DashboardLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Redirect if not logged in
  React.useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (!user) return null;

  // Compile navigation based on role
  const menuItems = [
    {
      label: 'Overview',
      path: '/dashboard',
      icon: Home,
      roles: ['admin', 'owner', 'buyer']
    },
    // Owner specific tabs
    {
      label: 'My Portfolio',
      path: '/dashboard/portfolio',
      icon: FolderKanban,
      roles: ['owner']
    },
    {
      label: 'Access Requests',
      path: '/dashboard/access-requests',
      icon: Lock,
      roles: ['owner', 'admin']
    },
    // Buyer specific tabs
    {
      label: 'Saved Patents',
      path: '/dashboard/bookmarks',
      icon: Bookmark,
      roles: ['buyer']
    },
    // Admin specific reviews
    {
      label: 'Review Queue',
      path: '/dashboard/reviews',
      icon: ShieldCheck,
      roles: ['admin']
    },
    // Interaction System (Leads & Meetings)
    {
      label: 'Leads Management',
      path: '/dashboard/leads',
      icon: Inbox,
      roles: ['owner', 'buyer']
    },
    {
      label: 'Negotiations',
      path: '/dashboard/negotiations',
      icon: Handshake,
      roles: ['owner', 'buyer']
    },
    {
      label: 'Meetings scheduled',
      path: '/dashboard/meetings',
      icon: Calendar,
      roles: ['owner', 'buyer']
    },
    {
      label: 'Escrow Ledger',
      path: '/dashboard/escrow',
      icon: FileKey2,
      roles: ['owner', 'buyer', 'admin']
    },
    // Admin user management / logs
    {
      label: 'Platform Users',
      path: '/dashboard/users',
      icon: Users,
      roles: ['admin']
    },
    {
      label: 'Security Audits',
      path: '/dashboard/audits',
      icon: Activity,
      roles: ['admin']
    }
  ].filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-lvx-surface dark:bg-zinc-950">
      {/* Sidebar Panel */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="p-6">
          <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label mb-4">
            Navigation Menu
          </div>
          
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard'}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md premium-transition",
                      isActive
                      ? "bg-lvx-blue/10 text-lvx-blue font-bold"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-lvx-charcoal dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-zinc-800/40"
                    )
                  }
                >
                  <Icon className="h-4.5 w-4.5 stroke-[2]" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Card */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-lvx-navy dark:bg-lvx-navy-card border border-lvx-navy-light flex items-center justify-center text-white font-bold text-sm">
              {user.name.charAt(0)}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-tight">
                {user.name.split(' (')[0]}
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                {user.organization || 'Independent'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:text-red-750 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100/75 dark:bg-red-950/20 dark:hover:bg-red-950/30 rounded-md premium-transition border border-red-500/10 dark:border-red-950/40"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Page Container */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Navbar / Tab bar */}
        <div className="md:hidden p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-2 overflow-x-auto shrink-0 scrollbar-none">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap premium-transition",
                    isActive
                      ? "bg-lvx-blue text-white font-semibold"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-lvx-charcoal dark:hover:text-white"
                  )
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            );
          })}
        </div>

        {/* Nested Route Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto text-zinc-900 dark:text-zinc-100 safe-bottom">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
