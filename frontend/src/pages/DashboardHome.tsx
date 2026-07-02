import { Link } from 'react-router-dom';
import { useAuthStore } from '../context/authStore';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Compass, Plus } from 'lucide-react';
import { DashboardOverview } from './Dashboards';

export const DashboardHome = () => {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(' (')[0] || 'there';

  const descriptions: Record<string, string> = {
    buyer: 'Track your requests, offers, escrow payments, and completed IP transactions.',
    owner: 'Manage your IP assets, access requests, and active negotiations.',
    admin: 'Platform overview, listings, escrow treasury, and operations.',
  };

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={descriptions[user?.role || 'buyer'] || descriptions.buyer}
        action={
          user?.role === 'buyer' ? (
            <Link to="/discover">
              <Button className="gap-2 rounded-xl">
                <Compass className="h-4 w-4" />
                Discover IP
              </Button>
            </Link>
          ) : user?.role === 'owner' ? (
            <Link to="/list-ip">
              <Button className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" />
                List new IP
              </Button>
            </Link>
          ) : undefined
        }
      />
      <DashboardOverview embedded />
    </div>
  );
};
