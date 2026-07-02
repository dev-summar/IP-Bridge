import { Link, Navigate, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { ASSET_TYPES } from '../constants/ip';
import { FilePlus, LogOut } from 'lucide-react';
import { PublicPageShell } from '../components/layout/PublicPageShell';
import { useAuthStore } from '../context/authStore';

export const ListIPPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  if (isAuthenticated && (user?.role === 'owner' || user?.role === 'admin')) {
    return <Navigate to="/dashboard/assets?new=1" replace />;
  }

  const handleSwitchToInventor = () => {
    logout();
    navigate('/auth?register=true&role=owner');
  };

  return (
    <PublicPageShell narrow>
      <div className="text-center">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <FilePlus className="h-7 w-7 text-primary" />
        </div>
        <PageHeader
          title="List your intellectual property"
          description="Patents, software IP, designs, trademarks, and university technologies — reach corporate acquirers and licensees."
        />
        <div className="flex flex-wrap justify-center gap-2 my-8">
          {ASSET_TYPES.map((t) => (
            <span
              key={t}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
            >
              {t}
            </span>
          ))}
        </div>
        <p className="text-sm text-zinc-500 mb-8 max-w-md mx-auto">
          AI generates your commercial brief automatically. Admin reviews listings before they go live.
        </p>

        {isAuthenticated && user?.role === 'buyer' ? (
          <div className="max-w-md mx-auto space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/50 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 text-left">
              You&apos;re signed in as a <strong>buyer</strong>. Buyers discover and acquire IP — listing requires a separate{' '}
              <strong>inventor account</strong>.
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/discover">
                <Button variant="outline" size="lg" className="rounded-xl h-12 px-8 font-semibold w-full sm:w-auto">
                  Browse Discover
                </Button>
              </Link>
              <Button
                size="lg"
                className="rounded-xl h-12 px-8 font-semibold gap-2 w-full sm:w-auto"
                onClick={handleSwitchToInventor}
              >
                <LogOut className="h-4 w-4" />
                Switch to inventor account
              </Button>
            </div>
          </div>
        ) : (
          <Link to="/auth?register=true&role=owner">
            <Button size="lg" className="rounded-xl h-12 px-10 font-semibold">
              Create inventor account
            </Button>
          </Link>
        )}
      </div>
    </PublicPageShell>
  );
};
