import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  GraduationCap,
  FlaskConical,
  Briefcase,
  Search,
  Lock,
  Handshake,
  FileCheck,
  Building2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PatentCard } from '../components/PatentCard';
import { BrandLogo } from '../components/BrandLogo';
import { FadeIn } from '../components/motion/FadeIn';
import { StaggerList, StaggerItem } from '../components/motion/StaggerList';
import { EmptyState } from '../components/ui/EmptyState';
import { springSnappy, transition } from '../utils/motion';
import { apiFetch } from '../hooks/useApi';
import { IP_CATEGORIES } from '../constants/ip';

const TRUST = ['Universities', 'Startups', 'Corporates', 'Research Labs'];

const STEPS = [
  { icon: Search, title: 'Discover', desc: 'Browse IP with AI scores, TRL, and industry tags.' },
  { icon: Lock, title: 'Unlock', desc: 'Org details, NDA, and inventor approval in three steps.' },
  { icon: Handshake, title: 'Negotiate', desc: 'Offers and counter-offers in a dedicated deal room.' },
  { icon: FileCheck, title: 'License', desc: 'Fund escrow milestones and close the transaction.' },
  { icon: Zap, title: 'Transfer', desc: 'Download the assignment deed when complete.' },
];

const TESTIMONIALS = [
  {
    quote: 'We found three licensable technologies in our first week. The AI briefs saved our corp dev team months.',
    name: 'Priya Nair',
    role: 'Head of Innovation, Tata Innovation Labs',
  },
  {
    quote: 'Finally a platform that treats university IP like a startup asset — not a PDF archive.',
    name: 'Prof. Ankur Gupta',
    role: 'MIET Technology Transfer',
  },
];

const STATS = [
  { value: '87+', label: 'Avg. AI commercial score' },
  { value: '3-step', label: 'Unlock flow' },
  { value: '5%', label: 'Success fee on close' },
];

export const LandingPage = () => {
  const navigate = useNavigate();
  const [patents, setPatents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiFetch('/api/patents?limit=3&page=1')
      .then((data) => setPatents((Array.isArray(data) ? data : data.data || []).slice(0, 3)))
      .catch(() => setPatents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(79,70,229,0.1),transparent)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 sm:pb-24 text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-6 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            IP Marketplace & Commercialization Platform
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-950 dark:text-white max-w-4xl mx-auto leading-[1.08]"
          >
            Commercialize intellectual property faster
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-lg sm:text-xl md:text-2xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed"
          >
            Patents, designs, and every form of IP — discover, evaluate, license, and transfer it all on one secure platform built for universities, startups, and corporates.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link to="/discover">
              <Button size="lg" className="h-12 px-8 text-base font-semibold rounded-xl shadow-sm gap-2">
                Browse IP
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/list-ip">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold rounded-xl border-zinc-200 bg-white dark:bg-zinc-900">
                List Your IP
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-14 grid grid-cols-3 gap-4 max-w-lg mx-auto"
          >
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...transition, delay: 0.28 + i * 0.06 }}
                whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
                className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur px-3 py-4 premium-transition"
              >
                <p className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">{s.value}</p>
                <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 leading-tight">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Trusted by */}
      <FadeIn>
        <section className="py-10 border-b border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-5">Trusted by</p>
            <div className="flex flex-wrap justify-center gap-8 sm:gap-12 text-zinc-600 dark:text-zinc-400">
              {TRUST.map((t, i) => (
                <motion.span
                  key={t}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                {t === 'Universities' && <GraduationCap className="h-4 w-4 text-primary/70" />}
                {t === 'Startups' && <Zap className="h-4 w-4 text-primary/70" />}
                {t === 'Corporates' && <Briefcase className="h-4 w-4 text-primary/70" />}
                {t === 'Research Labs' && <FlaskConical className="h-4 w-4 text-primary/70" />}
                {t}
                </motion.span>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* How it works */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <FadeIn className="text-center mb-12">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">How it works</h2>
            <p className="text-zinc-500 mt-3 max-w-lg mx-auto text-sm">From discovery to deed — one continuous workflow.</p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ ...transition, delay: i * 0.07 }}
                whileHover={{ y: -4, boxShadow: '0 12px 28px rgba(0,0,0,0.06)' }}
                className="text-center p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm premium-transition"
              >
                <div className="mx-auto h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-[10px] font-bold text-zinc-400">0{i + 1}</span>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mt-1">{step.title}</h3>
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/how-it-works">
              <Button variant="outline" className="rounded-xl">Learn more</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured IP */}
      <section className="py-16 sm:py-20 bg-zinc-50 dark:bg-zinc-950 border-y border-zinc-200/80 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">Featured IP</h2>
            <Link to="/discover" className="text-sm text-primary hover:underline shrink-0 flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div>
            {loading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2 py-4 border-b border-zinc-200/70 dark:border-zinc-800 animate-pulse">
                    <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                    <div className="h-4 bg-zinc-100 dark:bg-zinc-800/60 rounded w-full" />
                    <div className="h-3 bg-zinc-100 dark:bg-zinc-800/40 rounded w-1/2 mt-2" />
                  </div>
                ))}
              </div>
            ) : patents.length > 0 ? (
              <StaggerList>
                {patents.slice(0, 5).map((p) => (
                  <StaggerItem key={p._id} as="div">
                    <PatentCard
                      variant="compact"
                      patent={p}
                      isSaved={false}
                      onToggleBookmark={() => {}}
                      onExplore={(id) => navigate(`/marketplace/${id}`)}
                    />
                  </StaggerItem>
                ))}
              </StaggerList>
            ) : (
              <EmptyState
                title="No listings yet"
                description="Be the first to list intellectual property on IPBridge."
                actionLabel="List your IP"
                onAction={() => navigate('/list-ip')}
              />
            )}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-semibold text-zinc-950 dark:text-white">Browse by category</h2>
          <p className="text-sm text-zinc-500 mt-2">Filter the marketplace by industry and technology area.</p>
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {IP_CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat}
                initial={{ opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ ...transition, delay: i * 0.04 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to={`/discover?industry=${encodeURIComponent(cat)}`}
                  className="block px-4 py-2 rounded-full text-sm font-medium border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-primary hover:text-primary transition-colors shadow-sm"
                >
                  {cat}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">AI-powered insights</h2>
            <p className="text-zinc-500 mt-4 leading-relaxed text-sm sm:text-base">
              Every listing includes an executive summary, commercial potential score, industry match, and licensing recommendations — so buyers evaluate IP in minutes, not months.
            </p>
            <ul className="mt-8 space-y-3">
              {['Executive summary & problem solved', 'Commercial potential score', 'Industry match & TRL', 'Licensing recommendations'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 p-6 text-left font-mono text-xs text-emerald-400/90 shadow-lg">
            <p className="text-zinc-500 mb-3">// AI commercial brief</p>
            <p className="text-zinc-600">{'{'}</p>
            <p className="pl-4 text-emerald-400/90">&quot;commercialPotentialScore&quot;: 87,</p>
            <p className="pl-4 text-emerald-400/90">&quot;industryMatch&quot;: &quot;IoT · Cybersecurity&quot;,</p>
            <p className="pl-4 text-emerald-400/90">&quot;recommendation&quot;: &quot;Strategic license&quot;,</p>
            <p className="pl-4 text-emerald-400/90">&quot;trlLevel&quot;: 6</p>
            <p className="text-zinc-600">{'}'}</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-20 border-t border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-semibold text-center text-zinc-950 dark:text-white mb-10">What teams are saying</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.blockquote
                key={t.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...transition, delay: i * 0.1 }}
                whileHover={{ y: -2 }}
                className="p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shadow-sm premium-transition"
              >
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <cite className="not-italic font-semibold text-sm text-zinc-900 dark:text-white">{t.name}</cite>
                    <p className="text-xs text-zinc-500">{t.role}</p>
                  </div>
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 sm:p-14 shadow-sm">
            <Building2 className="h-10 w-10 mx-auto text-primary mb-5" />
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">
              Ready to commercialize IP?
            </h2>
            <p className="text-zinc-500 mt-3 text-sm sm:text-base">
              Join inventors and acquirers on India&apos;s modern IP marketplace.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/discover">
                <Button size="lg" className="rounded-xl h-12 px-8 font-semibold w-full sm:w-auto">
                  Browse IP
                </Button>
              </Link>
              <Link to="/auth?register=true&role=owner">
                <Button size="lg" variant="outline" className="rounded-xl h-12 px-8 font-semibold w-full sm:w-auto">
                  List your IP
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-10 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center sm:items-start gap-3">
            <BrandLogo size="sm" linkTo="/" />
            <span className="text-xs text-zinc-500">© {new Date().getFullYear()} IPBridge. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-zinc-500">
            <Link to="/about" className="hover:text-zinc-800 dark:hover:text-zinc-300">About</Link>
            <Link to="/how-it-works" className="hover:text-zinc-800 dark:hover:text-zinc-300">How it works</Link>
            <Link to="/pricing" className="hover:text-zinc-800 dark:hover:text-zinc-300">Pricing</Link>
            <Link to="/discover" className="hover:text-zinc-800 dark:hover:text-zinc-300">Discover IP</Link>
            <Link to="/auth?mode=login" className="hover:text-zinc-800 dark:hover:text-zinc-300">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
