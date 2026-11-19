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
    <div className="mb-12 rounded-2xl border border-white/80 bg-white/85 p-5 shadow-[0_12px_32px_rgba(57,139,232,0.08)] backdrop-blur-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <ProgressSteps
        variant="timeline"
        steps={DEAL_PROGRESS_STEPS.map((s) => ({ id: s.id, label: s.label }))}
        currentIndex={0}
      />
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      {STEPS.map((step) => (
        <div key={step.title} className="rounded-2xl border border-white/80 bg-white/85 p-6 shadow-[0_12px_32px_rgba(57,139,232,0.08)] backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <step.icon className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{step.desc}</p>
        </div>
      ))}
    </div>
    <Link to="/discover" className="mt-10 inline-block">
      <Button size="lg" className="h-12 rounded-xl px-8">Start Discovering</Button>
    </Link>
  </PublicPageShell>
);
