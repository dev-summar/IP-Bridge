import { PageHeader } from '../components/ui/PageHeader';
import { LeadsManager } from './Dashboards';

/** Buyer: interest + unlock requests */
export const BuyerRequestsPage = () => (
  <div>
    <PageHeader
      title="My Requests"
      description="Track interest submissions and unlock requests awaiting inventor approval."
    />
    <LeadsManager embedded />
  </div>
);
