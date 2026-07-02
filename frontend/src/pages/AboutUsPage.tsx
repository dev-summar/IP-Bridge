import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { PublicPageShell } from '../components/layout/PublicPageShell';
import { FadeIn } from '../components/motion/FadeIn';
import {
  Search,
  Sparkles,
  Shield,
  Building2,
  GraduationCap,
  Briefcase,
  FileText,
  Cpu,
  Palette,
  Scale,
} from 'lucide-react';
import { IP_CATEGORIES } from '../constants/ip';

const WHAT_WE_DO = [
  {
    icon: Search,
    title: 'Discover & evaluate IP',
    desc: 'Search patents, university technologies, and research innovations with AI-powered commercial briefs — not just PDF listings.',
  },
  {
    icon: Shield,
    title: 'Secure unlock & NDA',
    desc: 'Buyers request access through a structured flow: organization verification, NDA, and inventor approval before full details are shared.',
  },
  {
    icon: Scale,
    title: 'License, acquire, or transfer',
    desc: 'From exploratory meetings to offers, escrow milestones, and assignment deeds — one continuous deal workflow.',
  },
  {
    icon: Sparkles,
    title: 'AI commercial intelligence',
    desc: 'Every listing includes commercial potential scoring, industry fit, TRL maturity, and licensing recommendations.',
  },
];

const IP_TYPES = [
  { icon: FileText, label: 'Patents', desc: 'Granted and published inventions across engineering, biotech, and more.' },
  { icon: Cpu, label: 'Software & algorithms', desc: 'Code, models, and digital IP ready for licensing or acquisition.' },
  { icon: Palette, label: 'Designs & trademarks', desc: 'Industrial designs, brand assets, and creative IP portfolios.' },
  { icon: GraduationCap, label: 'University research', desc: 'Lab-to-market technologies from institutions and TTOs.' },
];

const AUDIENCE = [
  { icon: GraduationCap, title: 'Universities & inventors', desc: 'List IP, generate AI briefs, and reach corporate buyers without cold outreach.' },
  { icon: Briefcase, title: 'Corporates & acquirers', desc: 'Source technologies by industry, score fit fast, and close deals with escrow protection.' },
  { icon: Building2, title: 'Startups & R&D labs', desc: 'License building blocks or acquire IP to accelerate product roadmaps.' },
];

export const AboutUsPage = () => (
  <PublicPageShell>
    <PageHeader
      title="About IPBridge"
      description="We are India's intelligent IP trading platform — connecting inventors, institutions, and acquirers to commercialize intellectual property faster and more transparently."
    />

    <FadeIn className="mb-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">Our mission</h2>
      <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
        IPBridge bridges the gap between research and revenue. Most valuable IP never leaves the lab because discovery,
        evaluation, and deal-making are fragmented. We built a single platform where technologies are listed with
        AI-generated commercial profiles, buyers can search in plain English, and both sides move from first interest to
        funded transfer with NDAs, deal rooms, and escrow built in.
      </p>
    </FadeIn>

    <FadeIn delay={0.05}>
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-6">What we do</h2>
      <div className="grid sm:grid-cols-2 gap-4 mb-14">
        {WHAT_WE_DO.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</h3>
            <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </FadeIn>

    <FadeIn delay={0.08}>
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">IP we cover</h2>
      <p className="text-sm text-zinc-500 mb-6 max-w-2xl">
        From core patents to software and university spinouts — list and discover across asset types and industries.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
        {IP_TYPES.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 p-5"
          >
            <item.icon className="h-5 w-5 text-primary mb-3" />
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{item.label}</h3>
            <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </FadeIn>

    <FadeIn delay={0.1}>
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-6">Who we serve</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-14">
        {AUDIENCE.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center sm:text-left"
          >
            <item.icon className="h-6 w-6 text-primary mx-auto sm:mx-0 mb-3" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</h3>
            <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </FadeIn>

    <FadeIn delay={0.12}>
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">Industries on the platform</h2>
        <p className="text-sm text-zinc-500 mb-4">Browse technologies across these focus areas on Discover IP.</p>
        <div className="flex flex-wrap gap-2">
          {IP_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              to={`/discover?industry=${encodeURIComponent(cat)}`}
              className="px-3.5 py-1.5 rounded-full text-sm font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-primary hover:text-primary transition-colors"
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>
    </FadeIn>

    <div className="flex flex-col sm:flex-row gap-3 mt-12">
      <Link to="/discover">
        <Button size="lg" className="rounded-xl w-full sm:w-auto">Explore IP</Button>
      </Link>
      <Link to="/how-it-works">
        <Button size="lg" variant="outline" className="rounded-xl w-full sm:w-auto">
          See how it works
        </Button>
      </Link>
    </div>
  </PublicPageShell>
);
