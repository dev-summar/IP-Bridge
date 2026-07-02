import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../context/authStore';
import { getHomePathForRole, getListIPPath } from '../utils/authRoutes';
import { LogOut, Menu, X, Plus } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { Button } from '../components/ui/Button';
import { PUBLIC_NAV } from '../constants/navigation';
import { cn } from '../utils/cn';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => setMobileOpen(false), [location.pathname]);

  const isActive = (match: string) => {
    if (match === '/discover') return location.pathname.startsWith('/discover') || location.pathname.startsWith('/marketplace');
    return location.pathname === match;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const dashPath = user ? getHomePathForRole(user.role) : '/dashboard';
  const listIpPath = getListIPPath(user?.role);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl safe-top">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="shrink-0">
          <BrandLogo size="md" linkTo="/" priority className="max-w-[168px]" />
        </Link>

        <nav className="hidden md:flex items-center gap-1 relative">
          {PUBLIC_NAV.map((item) => {
            const active = isActive(item.match);
            return (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  'relative px-3.5 py-2.5 text-base font-medium rounded-lg transition-colors',
                  active
                    ? 'text-zinc-900 dark:text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 bg-zinc-100 dark:bg-zinc-800 rounded-lg -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link to={listIpPath} className="hidden sm:block">
            <Button variant="outline" size="sm" className="gap-1.5 font-medium border-zinc-200">
              <Plus className="h-3.5 w-3.5" />
              List IP
            </Button>
          </Link>

          {isAuthenticated ? (
            <>
              <Link to={dashPath}>
                <Button size="sm" className="font-medium hidden sm:inline-flex">
                  Dashboard
                </Button>
              </Link>
              <button
                onClick={handleLogout}
                className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link to="/auth?mode=login">
              <Button size="sm" variant="ghost" className="font-medium text-zinc-700">
                Sign In
              </Button>
            </Link>
          )}

          <button
            type="button"
            className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3 space-y-1">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="block px-3 py-2.5 text-base font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              {item.label}
            </Link>
          ))}
          <Link to={listIpPath} className="block px-3 py-2.5 text-base font-medium rounded-lg hover:bg-zinc-50">
            List IP
          </Link>
          {!isAuthenticated && (
            <Link to="/auth?mode=login" className="block px-3 py-2.5 text-base font-medium text-primary">
              Sign In
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
