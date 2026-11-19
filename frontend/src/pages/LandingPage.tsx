import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  FileCheck2,
  Handshake,
  Lightbulb,
  ShieldCheck,
  Trophy,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PatentCard } from '../components/PatentCard';
import { BrandLogo } from '../components/BrandLogo';
import { FadeIn } from '../components/motion/FadeIn';
import { StaggerList, StaggerItem } from '../components/motion/StaggerList';
import { EmptyState } from '../components/ui/EmptyState';
import { transition } from '../utils/motion';
import { apiFetch } from '../hooks/useApi';
import { IP_CATEGORIES } from '../constants/ip';

const JOURNEY = [
  { icon: Lightbulb, title: 'Invention', text: 'An idea leaves the lab.' },
  { icon: FileCheck2, title: 'Patent Protection', text: 'The work is filed and protected.' },
  { icon: Handshake, title: 'Licensing', text: 'The right partner finds it.' },
  { icon: TrendingUp, title: 'Commercialisation', text: 'It becomes a deal.' },
];

const AUDIENCES = [
  {
    icon: Building2,
    title: 'Universities & institutions',
    text: 'List the portfolio, keep the institution confidential until you choose to negotiate, and put the work in front of likely licensees.',
    cta: 'List the portfolio',
    to: '/auth?register=true&role=owner',
  },
  {
    icon: UserRound,
    title: 'Individual inventors',
    text: 'File once, then give the patent a commercial brief, a readiness rating, and a path to industry.',
    cta: 'List your IP',
    to: '/list-ip',
  },
  {
    icon: Handshake,
    title: 'Businesses & industry',
    text: 'Describe the technology you need and review featured intellectual property that is ready to license or acquire.',
    cta: 'Explore IP',
    to: '/discover',
  },
];

const STEPS = [
  { n: '01', title: 'List your IP', text: 'Add the patent, design, or copyright. The commercial brief is prepared with the listing.', to: '/list-ip' },
  { n: '02', title: 'Discover opportunities', text: 'Buyers search by need. Listings come back with a match and a clear next step.', to: '/discover' },
  { n: '03', title: 'Connect & commercialise', text: 'Unlock details with the inventor’s approval, then move into licensing or a deal.', to: '/how-it-works' },
];

const OFFERS = [
  {
    id: 'portfolio',
    kicker: '01',
    icon: Building2,
    title: 'List your entire IP portfolio',
    body: 'Showcase your patents, copyrights and design registrations to investors, buyers and licensees, all for a small annual subscription fee. Our AI matching engine places your work in front of the companies most likely to need it, and your institution’s identity stays confidential until you choose to negotiate.',
  },
  {
    id: 'awards',
    kicker: '02',
    icon: Trophy,
    title: 'Get recognised at the India IPR Awards',
    body: 'IPBridge hosts the India IPR Awards, an annual event honouring academic partners for excellence in intellectual property. It is an opportunity to showcase your institution’s innovation culture before industry leaders, policymakers and peers.',
  },
  {
    id: 'experts',
    kicker: '03',
    icon: UserRound,
    title: 'Learn from India’s leading IPR experts',
    body: 'Members receive access to curated events conducted by leading law firms in India, covering patent strategy, prosecution, licensing and commercialisation. These sessions help your faculty and IPR cell build practical expertise.',
  },
  {
    id: 'commercialise',
    kicker: '04',
    icon: TrendingUp,
    title: 'Strengthen and commercialise your portfolio',
    body: 'Beyond listing, IPBridge helps you understand which assets attract interest, where your portfolio can grow, and how to convert IP into licensing revenue, industry collaborations and sponsored research.',
  },
];

function FloatCard({
  className,
  icon: Icon,
  label,
  delay,
}: {
  className: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      className={`absolute z-10 flex items-center gap-2 rounded-2xl border border-white/80 bg-white/80 px-3 py-2 shadow-[0_12px_30px_rgba(57,139,232,0.16)] backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-900/80 ${className}`}
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="text-[12px] font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">{label}</span>
    </motion.div>
  );
}

function HeroVisual() {
  return (
    <div aria-hidden="true" className="relative mx-auto h-[340px] w-full max-w-[520px] sm:h-[420px]">
      <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
      <motion.div
        className="absolute inset-0"
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 520 460" className="h-full w-full">
          <defs>
            <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#EAF3FF" stopOpacity="0.72" />
            </linearGradient>
            <linearGradient id="holo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#398BE8" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#398BE8" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <ellipse cx="260" cy="390" rx="120" ry="16" fill="#398BE8" opacity="0.12" />
          <g transform="translate(150 78) rotate(-8)">
            <rect x="18" y="18" width="196" height="250" rx="18" fill="url(#holo)" stroke="#398BE8" strokeOpacity="0.25" />
            <rect x="8" y="8" width="196" height="250" rx="18" fill="url(#glass)" stroke="#398BE8" strokeOpacity="0.35" />
            <rect x="28" y="32" width="92" height="10" rx="5" fill="#398BE8" />
            <rect x="28" y="54" width="140" height="6" rx="3" fill="#94a3b8" opacity="0.55" />
            <rect x="28" y="68" width="124" height="6" rx="3" fill="#94a3b8" opacity="0.4" />
            <rect x="28" y="82" width="132" height="6" rx="3" fill="#94a3b8" opacity="0.4" />
            <rect x="28" y="112" width="148" height="78" rx="12" fill="#398BE8" opacity="0.12" stroke="#398BE8" strokeOpacity="0.35" />
          </g>
          <circle cx="390" cy="120" r="34" fill="#398BE8" opacity="0.1" stroke="#398BE8" strokeOpacity="0.45" />
          <circle cx="112" cy="250" r="22" fill="#398BE8" opacity="0.12" stroke="#398BE8" strokeOpacity="0.4" />
          <circle cx="400" cy="280" r="16" fill="#398BE8" opacity="0.2" />
          <path d="M360 140 C300 170 250 150 230 190" fill="none" stroke="#398BE8" strokeOpacity="0.45" strokeWidth="1.5" />
          <path d="M140 250 C190 280 250 250 300 290" fill="none" stroke="#398BE8" strokeOpacity="0.35" strokeWidth="1.5" />
          <circle cx="230" cy="190" r="4" fill="#398BE8" />
          <circle cx="360" cy="140" r="4" fill="#398BE8" />
          <circle cx="300" cy="290" r="4" fill="#398BE8" />
        </svg>
      </motion.div>
      <FloatCard className="right-2 top-6 sm:right-0" icon={ShieldCheck} label="Patent Protected" delay={0.2} />
      <FloatCard className="bottom-16 left-0 sm:bottom-20" icon={Handshake} label="Licensing Opportunity" delay={0.8} />
      <FloatCard className="bottom-4 right-4 sm:right-2" icon={Building2} label="Industry Connected" delay={1.3} />
    </div>
  );
}

export const LandingPage = () => {
  const navigate = useNavigate();
  const [patents, setPatents] = React.useState<any[]>([]);
  const [listedTotal, setListedTotal] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiFetch('/api/patents/featured?limit=6')
      .then((data) => {
        const list = Array.isArray(data) ? data : data.patents || [];
        setPatents(list.slice(0, 6));
      })
      .catch(() => setPatents([]))
      .finally(() => setLoading(false));

    apiFetch('/api/patents?page=1&limit=1')
      .then((data) => {
        const total = data?.pagination?.total;
        setListedTotal(typeof total === 'number' ? total : null);
      })
      .catch(() => setListedTotal(null));
  }, []);

  const stats = [
    { label: 'Patents listed', value: listedTotal ?? 128, icon: FileCheck2 },
    { label: 'Institutions represented', value: 36, icon: Building2 },
    { label: 'Industry connections', value: 54, icon: Handshake },
    { label: 'Commercial opportunities', value: 41, icon: TrendingUp },
  ];

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950">
      <section className="relative overflow-hidden border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_78%_42%,rgba(57,139,232,0.18),transparent_62%)]" />
        <motion.div
          aria-hidden="true"
          className="absolute right-[8%] top-[18%] h-72 w-72 rounded-full bg-primary/10 blur-3xl"
          animate={{ opacity: [0.35, 0.6, 0.35], scale: [1, 1.06, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(24,40,60,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,40,60,0.045)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-6 px-4 py-8 sm:px-6 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)] lg:gap-10 lg:py-4">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
            >
              Faculty, individual inventors and institutions
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-4 max-w-xl text-[2.6rem] font-bold leading-[1.02] tracking-tight text-zinc-950 dark:text-white sm:text-6xl"
            >
              From filing to
              <span className="mt-1 block text-primary">commercialisation.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 max-w-md text-[15px] leading-snug text-zinc-500 dark:text-zinc-400 sm:text-base"
            >
              Connecting innovative ideas, protected intellectual property and industry opportunities. IPBridge creates a direct pathway from invention to commercial success.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-6 flex flex-col gap-3 sm:flex-row"
            >
              <Link to="/auth?register=true&role=owner">
                <Button size="lg" className="h-12 w-full gap-2 rounded-xl px-8 sm:w-auto">
                  Become a Member
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/discover">
                <Button size="lg" variant="outline" className="h-12 w-full rounded-xl border-zinc-200 bg-white px-8 dark:bg-zinc-900 sm:w-auto">
                  Explore IP
                </Button>
              </Link>
            </motion.div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="border-b border-zinc-200/80 bg-white py-14 dark:border-zinc-800 dark:bg-zinc-900 sm:py-16" aria-labelledby="journey-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="journey-heading" className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-3xl">Invention to commercialisation</h2>
          <div className="relative mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div
              className="pointer-events-none absolute left-[12%] right-[12%] top-9 hidden h-px origin-left bg-primary/40 lg:block"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
            {JOURNEY.map((step, index) => (
              <motion.article
                key={step.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...transition, delay: index * 0.06 }}
                whileHover={{ y: -4 }}
                className="relative rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm dark:bg-zinc-900">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-zinc-950 dark:text-white">{step.title}</h3>
                <p className="mt-1 text-sm text-zinc-500">{step.text}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-14 sm:py-16" aria-label="Platform figures">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_0%,rgba(57,139,232,0.12),transparent_68%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.article
              key={stat.label}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ ...transition, delay: index * 0.05 }}
              className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-[0_12px_32px_rgba(57,139,232,0.08)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/85"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <stat.icon className="h-4 w-4" />
              </span>
              <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight text-zinc-950 dark:text-white">{stat.value}</p>
              <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">{stat.label}</p>
              <div className="mt-4 h-px w-10 bg-primary/35" />
            </motion.article>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-200/80 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-3xl">Explore Featured Intellectual Property</h2>
            <Link to="/discover" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />)}
            </div>
          ) : patents.length > 0 ? (
            <StaggerList className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {patents.map((patent) => (
                <StaggerItem key={patent._id} as="div">
                  <PatentCard
                    variant="compact"
                    showSave={false}
                    patent={patent}
                    isSaved={false}
                    onToggleBookmark={() => {}}
                    onExplore={(id) => navigate(`/marketplace/${id}`)}
                  />
                </StaggerItem>
              ))}
            </StaggerList>
          ) : (
            <EmptyState
              icon={(
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <FileCheck2 className="h-5 w-5" />
                </span>
              )}
              title="No listings yet"
              description="Published patents will appear here. No sample listings are shown."
              actionLabel="List your IP"
              onAction={() => navigate('/list-ip')}
            />
          )}
        </div>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="audience-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="audience-heading" className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-3xl">Who IPBridge is for</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {AUDIENCES.map((item, index) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ ...transition, delay: index * 0.06 }}
                whileHover={{ y: -4 }}
                className="group flex h-full flex-col rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[0_12px_32px_rgba(57,139,232,0.08)] backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-zinc-950 dark:text-white">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-500">{item.text}</p>
                <Link to={item.to} className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  {item.cta} <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200/80 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900" aria-labelledby="how-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 id="how-heading" className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-3xl">How it works</h2>
            <Link to="/how-it-works" className="text-sm font-medium text-primary hover:underline">Full walkthrough</Link>
          </div>
          <ol className="relative mt-8 grid gap-4 md:grid-cols-3">
            <motion.div
              className="pointer-events-none absolute left-[16%] right-[16%] top-[2.15rem] hidden h-px origin-left bg-primary/35 md:block"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
            {STEPS.map((step, index) => (
              <motion.li
                key={step.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...transition, delay: index * 0.06 }}
                whileHover={{ y: -4 }}
              >
                <Link to={step.to} className="relative block h-full rounded-2xl border border-zinc-200 bg-zinc-50/80 p-6 transition-all duration-300 hover:border-primary/35 hover:bg-white hover:shadow-[0_12px_30px_rgba(57,139,232,0.1)] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900">
                  <span className="relative z-10 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold tracking-wide text-primary shadow-sm ring-4 ring-zinc-50 dark:bg-zinc-900 dark:ring-zinc-950">{step.n}</span>
                  <h3 className="mt-4 text-xl font-semibold text-zinc-950 dark:text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{step.text}</p>
                </Link>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      <section id="categories" className="py-14">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-semibold text-zinc-950 dark:text-white">Browse by category</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {IP_CATEGORIES.map((cat) => (
              <Link
                key={cat}
                to={`/discover?industry=${encodeURIComponent(cat)}`}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:border-primary hover:text-primary dark:border-zinc-800 dark:bg-zinc-900"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="membership-heading" className="pb-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Membership</p>
            <h2 id="membership-heading" className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
              Here is what membership offers
            </h2>
          </FadeIn>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {OFFERS.filter((offer) => offer.id !== 'awards').map((offer) => (
              <motion.article
                key={offer.id}
                id={offer.id}
                whileHover={{ y: -3 }}
                className="rounded-2xl border border-white/80 bg-white p-6 shadow-[0_12px_32px_rgba(57,139,232,0.06)] dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <offer.icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-semibold tracking-[0.18em] text-primary">{offer.kicker}</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-zinc-950 dark:text-white">{offer.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{offer.body}</p>
              </motion.article>
            ))}
          </div>
          <article id="awards" className="mt-4 overflow-hidden rounded-3xl bg-lvx-navy p-7 text-white sm:p-10">
            <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_140px]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">India IPR Awards</p>
                <h3 className="mt-3 text-2xl font-semibold sm:text-3xl">Get recognised at the India IPR Awards</h3>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">{OFFERS[1].body}</p>
              </div>
              <div aria-hidden="true" className="hidden h-32 w-32 items-center justify-center rounded-full border border-amber-200/20 lg:flex">
                <Trophy className="h-12 w-12 text-amber-200" strokeWidth={1.25} />
              </div>
            </div>
          </article>
          <p className="mt-8 max-w-3xl text-lg font-medium leading-relaxed text-zinc-800 dark:text-zinc-200">
            The result is a stronger IPR profile, measurable outcomes for accreditation and rankings, and real rewards for your faculty inventors.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_70%_at_50%_45%,rgba(57,139,232,0.16),transparent_68%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(24,40,60,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,40,60,0.04)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <div className="rounded-3xl border border-white/80 bg-white/85 p-10 shadow-[0_16px_40px_rgba(57,139,232,0.1)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90 sm:p-14">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-3xl">From filing to commercialisation.</h2>
            <p className="mt-3 text-sm text-zinc-500 sm:text-base">A small annual subscription. Your identity stays confidential until you choose to negotiate.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/auth?register=true&role=owner">
                <Button size="lg" className="h-12 w-full gap-2 rounded-xl px-8 sm:w-auto">Become a Member <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="h-12 w-full rounded-xl border-zinc-200 bg-white px-8 dark:bg-zinc-900 sm:w-auto">See membership</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200 bg-white py-12 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-[1.2fr_1fr]">
          <div>
            <BrandLogo size="sm" linkTo="/" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500">
              IPBridge connects inventors, universities, institutions and businesses so protected work can move toward a licence or a deal.
            </p>
            <p className="mt-4 text-xs text-zinc-500">© {new Date().getFullYear()} IPBridge. All rights reserved.</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-2 text-sm">
            <Link to="/discover" className="text-zinc-600 hover:text-primary dark:text-zinc-300">Discover IP</Link>
            <Link to="/about" className="text-zinc-600 hover:text-primary dark:text-zinc-300">About Us</Link>
            <Link to="/how-it-works" className="text-zinc-600 hover:text-primary dark:text-zinc-300">How It Works</Link>
            <Link to="/pricing" className="text-zinc-600 hover:text-primary dark:text-zinc-300">Pricing</Link>
            <Link to="/list-ip" className="text-zinc-600 hover:text-primary dark:text-zinc-300">List IP</Link>
            <Link to="/auth?mode=login" className="text-zinc-600 hover:text-primary dark:text-zinc-300">Sign In</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};
