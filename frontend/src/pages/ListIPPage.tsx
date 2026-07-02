import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { ASSET_TYPES } from '../constants/ip';
import { FilePlus } from 'lucide-react';
import { PublicPageShell } from '../components/layout/PublicPageShell';

export const ListIPPage = () => (
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
          <span key={t} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
            {t}
          </span>
        ))}
      </div>
      <p className="text-sm text-zinc-500 mb-8 max-w-md mx-auto">
        AI generates your commercial brief automatically. Admin reviews listings before they go live.
      </p>
      <Link to="/auth?register=true&role=owner">
        <Button size="lg" className="rounded-xl h-12 px-10 font-semibold">
          Create inventor account
        </Button>
      </Link>
    </div>
  </PublicPageShell>
);
