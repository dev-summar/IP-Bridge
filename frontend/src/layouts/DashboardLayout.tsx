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
  const activeItem = [...menuItems].filter(item => location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'))).sort((a, b) => b.path.length - a.path.length)[0];
  const initials = user.name.split(' (')[0].trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  return (
    <div className="min-h-[100dvh] bg-slate-50/80 dark:bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-[100dvh] w-[236px] shrink-0 flex-col border-r border-slate-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
        <div className="border-b border-slate-100 px-5 py-5 dark:border-zinc-800">
          <BrandLogo size="sm" linkTo="/" className="w-full justify-start" />
        </div>
        <div className="px-5 pb-2 pt-6"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400 dark:text-zinc-500">{workspaceName} workspace</p></div>
        <nav aria-label="Workspace navigation" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path} aria-current={activeItem?.path === item.path ? 'page' : undefined}

                className={
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors',
                    activeItem?.path === item.path
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-slate-800 dark:text-zinc-100">{user.name.split(' (')[0]}</p>
              <p className="truncate text-[11px] text-slate-500 dark:text-zinc-400">{user.organization || workspaceName}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-500 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-900/95 sm:px-6 lg:px-8">
          <div className="lg:hidden"><BrandLogo size="sm" linkTo="/" className="max-w-[135px]" /></div>
          <div className="hidden items-center gap-2 text-[12px] text-slate-400 dark:text-zinc-500 lg:flex"><Link to="/dashboard" className="hover:text-blue-700 dark:hover:text-blue-300">{workspaceName} workspace</Link><ChevronRight className="h-3.5 w-3.5" /><span className="font-medium text-slate-700 dark:text-zinc-200">{activeItem?.path === '/dashboard' ? 'Overview' : activeItem?.label || 'Workspace'}</span></div>
          <div className="flex min-w-0 items-center gap-4"><Link to="/discover" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-600 hover:text-blue-700 dark:text-zinc-300 dark:hover:text-blue-300"><Compass className="h-4 w-4" /><span>Marketplace</span></Link><Link to="/dashboard/profile" aria-label="Open your profile" className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 sm:flex">{initials}</Link></div>
        </header>

        {/* Mobile bottom nav */}
        <nav aria-label="Mobile workspace navigation" className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur safe-bottom flex justify-around py-2">
          {menuItems.slice(0, 3).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path} aria-current={activeItem?.path === item.path ? 'page' : undefined}

                className={
                  cn(
                    'flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1.5 text-[10px] font-medium',
                    activeItem?.path === item.path ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-zinc-400'
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span className="truncate max-w-full">{item.label}</span>
              </Link>
            );
          })}
          <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen} className={cn('flex flex-1 min-w-0 flex-col items-center gap-1 px-1 py-1.5 text-[10px] font-medium', menuItems.slice(3).some(item => activeItem?.path === item.path) ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-zinc-400')}><MoreHorizontal className="h-5 w-5" /><span>More</span></button>
        </nav>

        <Dialog isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="Your workspace" description={`${user.name} · ${user.role}`}>
          <nav aria-label="All dashboard sections" className="space-y-1">
            {menuItems.map(item => <Link key={item.path} to={item.path} aria-current={activeItem?.path === item.path ? 'page' : undefined}  onClick={() => setMoreOpen(false)} className={ cn('flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium', activeItem?.path === item.path ? 'bg-primary/10 text-primary' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800')}><item.icon className="h-5 w-5" />{item.label}</Link>)}
          </nav>
          <button type="button" onClick={() => { setMoreOpen(false); logout(); navigate('/'); }} className="mt-4 flex w-full items-center gap-3 border-t border-zinc-200 dark:border-zinc-800 px-4 pt-4 pb-2 text-sm text-red-600"><LogOut className="h-5 w-5" />Sign out</button>
        </Dialog>

        <main className="mx-auto w-full max-w-[1480px] flex-1 p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
