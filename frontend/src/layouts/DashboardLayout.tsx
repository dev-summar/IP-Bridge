import React from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../context/authStore';
import { getDashboardNav } from '../constants/navigation';
import { BrandLogo } from '../components/BrandLogo';
import { LogOut, Compass } from 'lucide-react';
import { cn } from '../utils/cn';

export const DashboardLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  if (!user) return null;

  const menuItems = getDashboardNav(user.role);

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <BrandLogo size="sm" linkTo="/" className="w-full justify-start" />
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3.5 py-3 rounded-xl text-base font-medium transition-colors',
                    isActive
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0 opacity-70" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{user.name.split(' (')[0]}</p>
              <p className="text-xs text-zinc-500 truncate capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <BrandLogo size="sm" linkTo="/" className="max-w-[130px]" />
          <Link to="/discover" className="text-sm font-medium text-primary flex items-center gap-1">
            <Compass className="h-4 w-4" />
            Discover
          </Link>
        </header>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur safe-bottom flex justify-around py-2">
          {menuItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 px-2 py-1.5 text-xs font-medium min-w-[4.5rem]',
                    isActive ? 'text-primary' : 'text-zinc-500'
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span className="truncate max-w-[4.5rem]">{item.label.split(' ')[0]}</span>
              </NavLink>
            );
          })}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-24 md:pb-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
