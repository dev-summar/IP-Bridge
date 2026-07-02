import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Check } from 'lucide-react';
import { PublicPageShell } from '../components/layout/PublicPageShell';

const PLANS = [
  {
    name: 'Inventor',
    price: 'Free to list',
    desc: 'Universities and inventors publish IP assets.',
    features: ['Unlimited listings', 'AI commercial briefs', 'Access request management', '5% success fee on closed deals'],
  },
  {
    name: 'Corporate',
    price: 'Contact us',
    desc: 'For teams acquiring and licensing IP at scale.',
    features: ['Unlimited discovery', 'Deal rooms', 'Escrow & milestones', 'Dedicated support'],
    highlight: true,
  },
];

export const PricingPage = () => (
  <PublicPageShell>
    <PageHeader title="Simple, transparent pricing" description="List for free. Pay only when deals close." />
    <div className="grid md:grid-cols-2 gap-6">
      {PLANS.map((plan) => (
        <div
          key={plan.name}
          className={`rounded-2xl border p-8 bg-white dark:bg-zinc-900 ${
            plan.highlight ? 'border-primary shadow-lg ring-1 ring-primary/20' : 'border-zinc-200 dark:border-zinc-800'
          }`}
        >
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{plan.name}</h3>
          <p className="text-2xl font-bold mt-2 text-zinc-950 dark:text-white">{plan.price}</p>
          <p className="text-sm text-zinc-500 mt-2">{plan.desc}</p>
          <ul className="mt-6 space-y-3">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="text-center mt-12">
      <Link to="/auth?register=true&role=owner">
        <Button size="lg" className="rounded-xl">List Your IP</Button>
      </Link>
    </div>
  </PublicPageShell>
);
