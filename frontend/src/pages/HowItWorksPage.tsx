import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { DEAL_PROGRESS_STEPS } from '../constants/ip';
import { ProgressSteps } from '../components/ui/ProgressSteps';
import { PublicPageShell } from '../components/layout/PublicPageShell';
import { Search, Lock, Handshake, FileCheck } from 'lucide-react';

const STEPS = [
  { icon: Search, title: 'Discover', desc: 'Browse IP assets with AI scores, TRL levels, and industry tags.' },
  { icon: Lock, title: 'Unlock', desc: 'Enter org details, sign NDA, and request access in three steps.' },
  { icon: Handshake, title: 'Negotiate', desc: 'Use the Deal Room for offers, meetings, and documents.' },
  { icon: FileCheck, title: 'Transfer', desc: 'Fund escrow milestones and download the assignment deed.' },
];

export const HowItWorksPage = () => (
  <PublicPageShell narrow>
    <PageHeader
      title="How IPBridge Works"
      description="A simple path from discovery to IP transfer — built for universities, startups, and corporates."
    />
    <div className="mb-12 p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <ProgressSteps
        variant="timeline"
        steps={DEAL_PROGRESS_STEPS.map((s) => ({ id: s.id, label: s.label }))}
        currentIndex={0}
      />
    </div>
    <div className="grid sm:grid-cols-2 gap-4">
      {STEPS.map((step) => (
        <div key={step.title} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <step.icon className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{step.title}</h3>
          <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{step.desc}</p>
        </div>
      ))}
    </div>
    <Link to="/discover" className="inline-block mt-10">
      <Button className="rounded-xl">Start Discovering</Button>
    </Link>
  </PublicPageShell>
);
