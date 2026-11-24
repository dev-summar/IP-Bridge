import React from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../context/authStore';
import { getDashboardNav } from '../constants/navigation';
import { BrandLogo } from '../components/BrandLogo';
import { LogOut, Compass, MoreHorizontal, ChevronRight } from 'lucide-react';
import { Dialog } from '../components/ui/Dialog';
import { cn } from '../utils/cn';

export const DashboardLayout = () => {
  const { user, logout, isInitialized } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = React.useState(false);
  React.useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  React.useEffect(() => {
    if (isInitialized && !user) navigate('/auth');
  }, [user, isInitialized, navigate]);

  if (!isInitialized) return <p role="status" className="p-8 text-sm text-zinc-500">Opening your workspace…</p>;
  if (!user) return null;

  const menuItems = getDashboardNav(user.role);
  const workspaceName = user.role === 'owner' ? 'Inventor' : user.role === 'admin' ? 'Admin' : 'Buyer';
  const activeItem = [...menuItems]
    .filter((item) => location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(`${item.path}/`)))
    .sort((a, b) => b.path.length - a.path.length)[0];
  const initials = user.name
    .split(' (')[0]
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="relative flex min-h-[100dvh] bg-[#f4f7fb] dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_0%_0%,rgba(57,139,232,0.18),transparent_55%),radial-gradient(ellipse_50%_40%_at_100%_0%,rgba(16,185,129,0.08),transparent_50%)] dark:bg-[radial-gradient(ellipse_70%_45%_at_0%_0%,rgba(57,139,232,0.16),transparent_55%)]" />

      <aside className="relative sticky top-0 z-20 hidden h-[100dvh] w-[248px] shrink-0 flex-col border-r border-white/70 bg-white/80 shadow-[0_0_0_1px_rgba(15,23,42,0.03)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/90 lg:flex">
        <div className="border-b border-slate-100/80 px-5 py-5 dark:border-zinc-800">
          <BrandLogo size="sm" linkTo="/" className="w-full justify-start" />
        </div>
        <div className="px-5 pb-2 pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/80">{workspaceName} workspace</p>
        </div>
        <nav aria-label="Workspace navigation" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = activeItem?.path === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all',
                  active
                    ? 'bg-gradient-to-r from-primary to-[#2f6fbf] text-white shadow-md shadow-primary/25'
                    : 'text-slate-500 hover:bg-primary/5 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100',
                )}
              >
                <span className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                  active ? 'bg-white/15' : 'bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary dark:bg-zinc-800 dark:text-zinc-400',
                )}>
                  <Icon className="h-4 w-4" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-100/80 p-4 dark:border-zinc-800">
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-primary/10 via-white to-emerald-50/60 px-3 py-3 dark:from-primary/15 dark:via-zinc-900 dark:to-zinc-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white shadow-sm shadow-primary/30">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-zinc-100">{user.name.split(' (')[0]}</p>
              <p className="truncate text-[11px] text-slate-500 dark:text-zinc-400">{user.organization || workspaceName}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-rose-950/20 dark:hover:text-rose-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/70 bg-white/75 px-4 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/80 sm:px-6 lg:px-8">
          <div className="lg:hidden"><BrandLogo size="sm" linkTo="/" className="max-w-[135px]" /></div>
          <div className="hidden items-center gap-2 text-[12px] text-slate-400 dark:text-zinc-500 lg:flex">
            <Link to="/dashboard" className="hover:text-primary">{workspaceName} workspace</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-semibold text-slate-700 dark:text-zinc-200">
              {activeItem?.path === '/dashboard' ? 'Overview' : activeItem?.label || 'Workspace'}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/discover"
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-[12px] font-semibold text-primary hover:bg-primary/10 dark:border-primary/25 dark:bg-primary/10"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Marketplace</span>
            </Link>
            <Link
              to="/dashboard/profile"
              aria-label="Open your profile"
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#2f6fbf] text-[11px] font-semibold text-white shadow-sm shadow-primary/30 sm:flex"
            >
              {initials}
            </Link>
          </div>
        </header>

        <nav aria-label="Mobile workspace navigation" className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-zinc-200/80 bg-white/95 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 lg:hidden">
          {menuItems.slice(0, 3).map((item) => {
            const Icon = item.icon;
            const active = activeItem?.path === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1.5 text-[10px] font-medium',
                  active ? 'text-primary' : 'text-slate-500 dark:text-zinc-400',
                )}
              >
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', active && 'bg-primary/10')}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1.5 text-[10px] font-medium',
              menuItems.slice(3).some((item) => activeItem?.path === item.path) ? 'text-primary' : 'text-slate-500 dark:text-zinc-400',
            )}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl">
              <MoreHorizontal className="h-5 w-5" />
            </span>
            <span>More</span>
          </button>
        </nav>

        <Dialog isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="Your workspace" description={`${user.name} · ${user.role}`}>
          <nav aria-label="All dashboard sections" className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                aria-current={activeItem?.path === item.path ? 'page' : undefined}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium',
                  activeItem?.path === item.path ? 'bg-primary/10 text-primary' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => { setMoreOpen(false); logout(); navigate('/'); }}
            className="mt-4 flex w-full items-center gap-3 border-t border-zinc-200 px-4 pb-2 pt-4 text-sm text-red-600 dark:border-zinc-800"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </Dialog>

        <main className="mx-auto w-full max-w-[1480px] flex-1 p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
