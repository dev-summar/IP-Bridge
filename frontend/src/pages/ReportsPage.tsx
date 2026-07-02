import { PageHeader } from '../components/ui/PageHeader';
import { AuditsManager, DashboardOverview } from './Dashboards';

export const ReportsPage = () => (
  <div className="space-y-10">
    <PageHeader title="Reports" description="Platform analytics and security audit trail." />
    <DashboardOverview embedded />
    <section>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Recent activity</h2>
      <AuditsManager embedded />
    </section>
  </div>
);
