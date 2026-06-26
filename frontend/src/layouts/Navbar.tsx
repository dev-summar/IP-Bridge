import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../context/authStore';
import { LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { BrandLogo } from '../components/BrandLogo';
import { cn } from '../utils/cn';

const NAV_LINKS = [
  { label: 'For Inventors', to: '/auth?register=true&role=owner' },
  { label: 'For Buyers', to: '/auth?register=true&role=buyer' },
  { label: 'Marketplace', to: '/marketplace', match: '/marketplace' },
  { label: 'About Us', to: '/#about', match: '/#about' },
];

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '/marketplace') {
      return location.pathname.startsWith('/marketplace');
    }
    if (path === '/#about') {
      return location.pathname === '/' && location.hash === '#about';
    }
    return location.pathname === path;
  };

  const linkClass = (active: boolean) =>
    cn(
      'text-[15px] font-medium premium-transition whitespace-nowrap',
      active ? 'text-white' : 'text-white/85 hover:text-white',
    );

  const mobileLinkClass = (active: boolean) =>
    cn(
      'block w-full text-left px-4 py-3.5 text-base font-medium rounded-lg premium-transition touch-target',
      active
        ? 'bg-white/10 text-white'
        : 'text-white/80 hover:bg-white/5 hover:text-white',
    );

  const handleAboutNav = (e: React.MouseEvent) => {
    if (location.pathname === '/' && location.hash === '#about') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('pb-about-slide'));
    }
    setMobileOpen(false);
  };

  const navLinks = (
    <>
      {NAV_LINKS.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          onClick={item.label === 'About Us' ? handleAboutNav : () => setMobileOpen(false)}
          className={linkClass(isActive(item.match ?? item.to))}
        >
          {item.label}
        </Link>
      ))}
      {isAuthenticated && (
        <Link
          to={user?.role === 'buyer' ? '/dashboard/bookmarks' : '/dashboard'}
          onClick={() => setMobileOpen(false)}
          className={cn(
            linkClass(isActive('/dashboard') || location.pathname.startsWith('/dashboard')),
            'inline-flex items-center gap-1.5',
          )}
        >
          <LayoutDashboard className="h-4 w-4 opacity-80" />
          {user?.role === 'buyer' ? 'My Activity' : 'Dashboard'}
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 w-full bg-lvx-navy text-white border-b border-white/5 safe-top">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-10">
        <div className="relative flex h-14 sm:h-[72px] items-center gap-3">
          <div className="shrink-0 z-10">
            <BrandLogo variant="stacked" />
          </div>

          <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-8 xl:gap-10">
            {navLinks}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3 z-10">
            {isAuthenticated ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex items-center gap-2">
                  {user?.role === 'owner' && (
                    <Badge variant="indigo" className="py-0.5 text-[10px] font-semibold bg-white/15 text-white border-white/10">
                      INVENTOR
                    </Badge>
                  )}
                  {user?.role === 'buyer' && (
                    <Badge variant="neutral" className="py-0.5 text-[10px] font-semibold bg-white/10 text-white/90 border-white/10">
                      BUYER
                    </Badge>
                  )}
                  {user?.role === 'admin' && (
                    <Badge variant="success" className="py-0.5 text-[10px] font-semibold">ADMIN</Badge>
                  )}
                </div>
                <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center font-semibold text-xs text-white">
                  {user?.name.charAt(0)}
                </div>
                <button
                  onClick={handleLogout}
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white/70 hover:text-white premium-transition touch-target"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link to="/auth?mode=login" className="hidden sm:block">
                <button className="bg-white text-lvx-navy hover:bg-white/95 px-5 sm:px-6 py-2.5 text-xs font-bold tracking-caps uppercase rounded-md premium-transition shadow-sm touch-target">
                  Login
                </button>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="lg:hidden flex items-center justify-center h-10 w-10 rounded-md text-white hover:bg-white/10 premium-transition touch-target"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu overlay"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="absolute top-0 right-0 h-full w-[min(100%,20rem)] bg-lvx-navy border-l border-white/10 shadow-2xl flex flex-col safe-top safe-bottom">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <span className="text-sm font-bold text-white/70 uppercase tracking-label">Menu</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="h-10 w-10 flex items-center justify-center rounded-md hover:bg-white/10 touch-target"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={item.label === 'About Us' ? handleAboutNav : () => setMobileOpen(false)}
                  className={mobileLinkClass(isActive(item.match ?? item.to))}
                >
                  {item.label}
                </Link>
              ))}
              {isAuthenticated && (
                <Link
                  to={user?.role === 'buyer' ? '/dashboard/bookmarks' : '/dashboard'}
                  onClick={() => setMobileOpen(false)}
                  className={mobileLinkClass(location.pathname.startsWith('/dashboard'))}
                >
                  {user?.role === 'buyer' ? 'My Activity' : 'Dashboard'}
                </Link>
              )}
            </div>

            <div className="p-4 border-t border-white/10 space-y-3">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-300 bg-red-500/10 rounded-lg touch-target"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              ) : (
                <Link to="/auth?mode=login" onClick={() => setMobileOpen(false)} className="block">
                  <button className="w-full bg-white text-lvx-navy py-3 text-xs font-bold tracking-caps uppercase rounded-md touch-target">
                    Login
                  </button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
