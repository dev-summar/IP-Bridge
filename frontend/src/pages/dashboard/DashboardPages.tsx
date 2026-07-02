import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Plus } from 'lucide-react';
import {
  PortfolioManager,
  AccessRequestsManager,
  NegotiationsManager,
  ReviewsManager,
  UsersManager,
  EscrowManager,
  MeetingsManager,
  BookmarksManager,
} from '../Dashboards';

export const AssetsPage = () => (
  <div>
    <PageHeader
      title="My IP Assets"
      description="Manage your portfolio listings, AI scores, and verification status."
      action={
        <Link to="/list-ip">
          <Button size="sm" className="rounded-xl gap-1.5">
            <Plus className="h-4 w-4" />
            List new IP
          </Button>
        </Link>
      }
    />
    <PortfolioManager embedded />
  </div>
);

export const AccessRequestsPage = () => (
  <div>
    <PageHeader
      title="Access Requests"
      description="Review unlock requests from buyers who want full IP details."
    />
    <AccessRequestsManager embedded />
  </div>
);

export const NegotiationsPage = () => (
  <div>
    <PageHeader
      title="Negotiations"
      description="Manage offers, counter-offers, and signed agreements."
    />
    <NegotiationsManager embedded />
  </div>
);

export const ListingsPage = () => (
  <div>
    <PageHeader
      title="IP Listings"
      description="Review and approve new patent submissions before they go live."
    />
    <ReviewsManager embedded />
  </div>
);

export const UsersPage = () => (
  <div>
    <PageHeader
      title="Users"
      description="Platform accounts — buyers, inventors, and administrators."
    />
    <UsersManager embedded />
  </div>
);

export const EscrowPage = () => (
  <div>
    <PageHeader
      title="Escrow"
      description="Milestone-based escrow vault — fund, release, and complete transfers."
    />
    <EscrowManager embedded />
  </div>
);

export const MeetingsPage = () => (
  <div>
    <PageHeader
      title="Meetings"
      description="Exploratory video calls with inventors or buyers — schedule, accept, and join."
    />
    <MeetingsManager embedded />
  </div>
);

export const SavedIPPage = () => (
  <div>
    <PageHeader
      title="Saved IP"
      description="Patents you've bookmarked while browsing Discover."
      action={
        <Link to="/discover">
          <Button size="sm" variant="outline" className="rounded-xl">
            Browse Discover
          </Button>
        </Link>
      }
    />
    <BookmarksManager embedded />
  </div>
);
