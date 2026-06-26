import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Search, CheckCircle2, Check,
  ExternalLink
} from 'lucide-react';
import { PatentCard } from '../components/PatentCard';
import { BrandLogo } from '../components/BrandLogo';
import { apiFetch } from '../hooks/useApi';
import {
  LvxSectionLabel, LvxHeading, EcosystemCard, fadeUp,
  slideInContainer, slideInItem,
} from '../components/landing/LvxPrimitives';

const STATS = [
  { value: '6,800+', label: 'Patents Indexed' },
  { value: '$114M+', label: 'Deal Flow Initiated' },
  { value: '96%', label: 'AI Accuracy Rating' },
  { value: '715+', label: 'Active Listings' },
];

const ABOUT_PILLARS = [
  {
    title: 'Verified Inventors',
    description: 'Every listing is tied to official registry records and institutional affiliation — no anonymous uploads.',
  },
  {
    title: 'Serious Acquirers',
    description: 'Corporate buyers, licensing partners, and venture funds actively seeking IP to license or acquire.',
  },
  {
    title: 'Zero Commission',
    description: 'Direct inventor-to-buyer matching with no platform cut on closed deals. No guesswork, no middlemen.',
  },
];

const PORTFOLIO_HIGHLIGHTS = [
  {
    title: 'Biomechanical Footwear Monitoring System',
    sector: 'Healthcare / IoT',
    founders: 'Prof. Ankur Gupta',
    milestone: 'Commercial Score 88/100 — 4 qualified buyer inquiries',
    link: '/marketplace',
  },
  {
    title: 'Explainable Edge Medical Imaging Controller',
    sector: 'AI & Healthcare',
    founders: 'MIET Research Lab',
    milestone: 'TRL 6 — Licensing discussions underway',
    link: '/marketplace',
  },
  {
    title: 'Solid-State Battery Thermoregulation Assembly',
    sector: 'Clean Energy',
    founders: 'Marcus Vance',
    milestone: 'Raised interest from 3 EV manufacturers',
    link: '/marketplace',
  },
];

export const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchVal, setSearchVal] = useState('');
  const [realPatents, setRealPatents] = useState<any[]>([]);
  const [aboutSlideKey, setAboutSlideKey] = useState(0);

  useEffect(() => {
    const loadRealPatents = async () => {
      try {
        const data = await apiFetch('/api/patents');
        if (Array.isArray(data) && data.length > 0) {
          setRealPatents(data);
        }
      } catch (err) {
        console.error('Failed to fetch real patents for landing page:', err);
      }
    };
    loadRealPatents();
  }, []);

  useEffect(() => {
    if (location.hash !== '#about') return;
    setAboutSlideKey((k) => k + 1);
    const timer = window.setTimeout(() => {
      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.hash, location.pathname]);

  useEffect(() => {
    const replayAboutSlide = () => {
      setAboutSlideKey((k) => k + 1);
      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener('pb-about-slide', replayAboutSlide);
    return () => window.removeEventListener('pb-about-slide', replayAboutSlide);
  }, []);

  const featuredPatents = [
    {
      _id: '1',
      title: 'Adaptive Neural Architecture for Low-Power Edge Inference',
      patentNumber: 'US-11394025-B2',
      ownerName: 'Dr. Alexander Chen',
      ownerOrganization: 'Stanford Robotics Lab',
      analysis: {
        commercialPotentialScore: 88,
        industryClassification: ['AI & Machine Learning'],
        summary: {
          description: 'A runtime monitor that dynamically bypasses neural network layers under local power constraints.',
          problemSolved: 'Edge inference models consume excessive battery, causing thermal throttles on IoT hardware.',
          commercialValue: 'Reduces energy consumption by 40% while preserving up to 98% model accuracy.',
          keyInnovation: 'Adaptive layer bypassing based on dynamic hardware resource scheduling.',
        },
        commercialApplications: {
          potentialIndustries: ['Smart Surveillance', 'Industrial IoT', 'Robotics', 'Edge Computing'],
          useCases: ['On-device video analytics', 'Low-latency robotic vision systems'],
        },
      },
    },
    {
      _id: '2',
      title: 'Targeted Polymeric Nanocarriers Reacting to Acidic Tumor Microenvironments',
      patentNumber: 'US-10874742-B1',
      ownerName: 'Dr. Sarah Jenkins',
      ownerOrganization: 'MIT Bio Lab',
      analysis: {
        commercialPotentialScore: 92,
        industryClassification: ['Healthcare / BioTech'],
        summary: {
          description: 'pH-sensitive polymers that release encapsulated therapeutics when exposed to acidic tumor pH.',
          problemSolved: 'Current cancer therapies cause high systemic toxicity due to off-target delivery.',
          commercialValue: 'Improves therapeutic localization by 3x, lowering side-effects and dosage requirements.',
          keyInnovation: 'Acidity-triggered polymeric unpacking mechanism.',
        },
        commercialApplications: {
          potentialIndustries: ['BioTech', 'Oncology', 'Targeted Therapeutics', 'Precision Medicine'],
          useCases: ['Precise chemotherapeutic targeting', 'Local drug delivery systems'],
        },
      },
    },
    {
      _id: '3',
      title: 'High-Density Thermoregulating Solid-State Battery Assembly',
      patentNumber: 'US-11502360-B2',
      ownerName: 'Marcus Vance',
      ownerOrganization: 'Tesla Battery Group',
      analysis: {
        commercialPotentialScore: 85,
        industryClassification: ['Energy & Cleantech'],
        summary: {
          description: 'Phase-change ceramic sheets that absorb heat during high-speed 3C battery charging.',
          problemSolved: 'Solid-state batteries suffer rapid capacity degradation under high heat and fast charging.',
          commercialValue: 'Extends cell lifetime by 150% and supports safe fast charging at 3C speeds.',
          keyInnovation: 'Integrated phase-change material matrix with high thermal storage.',
        },
        commercialApplications: {
          potentialIndustries: ['Clean Energy', 'Electric Vehicles', 'Industrial Batteries', 'Power Grid'],
          useCases: ['High-rate grid load-balancing packs', 'Long-range electric vehicle powertrains'],
        },
      },
    },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col premium-transition overflow-x-hidden">

      {/* ── Hero + Stats (LetsVenture style) ── */}
      <section className="lvx-hero-bg text-white pt-8 sm:pt-12 pb-16 sm:pb-20 lg:pt-20 lg:pb-28 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-display leading-[1.05]"
          >
            Where Patents Find Buyers
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed font-light"
          >
            The marketplace that connects verified inventors with serious acquirers — no commission, no guesswork.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-2 w-full max-w-md sm:max-w-none mx-auto"
          >
            <Link to="/auth?register=true&role=buyer" className="w-full sm:w-auto">
              <button className="lvx-cta-btn w-full sm:min-w-[180px]">For Buyers</button>
            </Link>
            <Link to="/auth?register=true&role=owner" className="w-full sm:w-auto">
              <button className="lvx-cta-btn w-full sm:min-w-[180px]">For Inventors</button>
            </Link>
          </motion.div>

          {/* Search bar */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onSubmit={(e) => { e.preventDefault(); navigate(`/marketplace?query=${encodeURIComponent(searchVal)}`); }}
            className="max-w-lg mx-auto pt-4"
          >
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="Search patents, industries, innovations..."
                  className="w-full pl-10 pr-4 py-3 bg-white/8 border border-white/15 rounded-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lvx-blue text-sm"
                />
              </div>
              <button type="submit" className="lvx-cta-btn px-5 py-3 text-[11px]">
                Search
              </button>
            </div>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/50">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Zero commission matching</span>
              <span className="mx-1">•</span>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Verified patent registration</span>
            </div>
          </motion.form>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-5xl mx-auto mt-16 lg:mt-20"
        >
          <p className="text-center text-sm font-medium text-white/60 mb-8 tracking-wide">
            Real Numbers. Real Impact
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="lvx-stat-card px-5 py-6 sm:px-6 sm:py-8 text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-[10px] sm:text-xs font-semibold text-white/60 uppercase tracking-label">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── About Us (slides in on nav) ── */}
      <section
        id="about"
        className="px-6 py-20 lg:py-28 bg-white dark:bg-zinc-900 border-b border-zinc-200/60 dark:border-zinc-800 scroll-mt-[72px]"
      >
        <div className="max-w-7xl mx-auto overflow-hidden">
          <motion.div
            key={aboutSlideKey}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={slideInContainer}
          >
            <motion.div variants={slideInItem} className="flex items-center gap-4 mb-5">
              <span className="text-[11px] font-semibold uppercase tracking-label text-lvx-label shrink-0">
                About Us
              </span>
              <span className="lvx-label-line flex-1 max-w-[200px] h-px" aria-hidden />
            </motion.div>

            <motion.h2
              variants={slideInItem}
              className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-lvx-charcoal dark:text-white tracking-display leading-[1.12]"
            >
              Where Patents Find Buyers
              <br />
              Built on Trust, Not Commissions
            </motion.h2>

            <motion.p
              variants={slideInItem}
              className="mt-6 max-w-2xl text-[15px] sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed"
            >
              PatentBridge is the marketplace that connects verified inventors with serious acquirers.
              We index patents, score commercial potential with AI, and match the right buyers —
              with zero commission on deals and full transparency at every step.
            </motion.p>

            <motion.div
              variants={slideInContainer}
              className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
            >
              {ABOUT_PILLARS.map((pillar) => (
                <motion.div
                  key={pillar.title}
                  variants={slideInItem}
                  className="border border-zinc-200/80 dark:border-zinc-800 rounded-lg p-6 bg-lvx-surface/50 dark:bg-zinc-950/40"
                >
                  <h3 className="text-base font-bold text-lvx-charcoal dark:text-white tracking-heading mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {pillar.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Enter the Ecosystem ── */}
      <section className="px-6 py-20 lg:py-28 bg-lvx-surface dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <LvxSectionLabel>What We Do</LvxSectionLabel>
          <LvxHeading
            line1="Enter the Ecosystem"
            line2="with PatentBridge"
            className="mb-12 lg:mb-16"
          />

          <div className="space-y-6">
            <EcosystemCard
              brandAccent="discover"
              title="Start your IP Discovery Journey"
              description="Discover disruptive patents in their early and growth stages. Invest in or license verified innovations as a new or experienced corporate buyer."
              exploreLink="/marketplace"
            />
            <EcosystemCard
              brandAccent="list"
              title="Exclusive Access for Inventors"
              description="List your patents, get AI-powered commercial analysis, and connect with the right acquirers, licensing partners, and venture funds."
              exploreLink="/auth?register=true&role=owner"
              delay={0.12}
            />
          </div>
        </div>
      </section>

      {/* ── Portfolio Highlights ── */}
      <section className="px-6 py-20 lg:py-28 bg-white dark:bg-zinc-900 border-y border-zinc-200/60 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <LvxSectionLabel>Portfolio Highlights</LvxSectionLabel>
              <LvxHeading line1="Be Part of the" line2="Next Big Win" />
            </div>
            <motion.div {...fadeUp}>
              <Link to="/marketplace" className="lvx-explore-btn text-[10px] py-3 px-5">
                View All <ArrowRight className="h-3.5 w-3.5 inline ml-1" />
              </Link>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {PORTFOLIO_HIGHLIGHTS.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                className="bg-lvx-surface dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 rounded-md p-6 flex flex-col justify-between premium-transition hover:shadow-premium-md"
              >
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-lvx-blue uppercase tracking-label">{item.sector}</span>
                  <h3 className="text-base font-bold text-lvx-navy dark:text-white leading-snug">{item.title}</h3>
                  <div className="space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <p><span className="font-semibold text-zinc-700 dark:text-zinc-300">Inventor:</span> {item.founders}</p>
                    <p><span className="font-semibold text-zinc-700 dark:text-zinc-300">Milestone:</span> {item.milestone}</p>
                  </div>
                </div>
                <Link to={item.link} className="mt-5 inline-flex items-center gap-1 text-[11px] font-bold tracking-wide uppercase text-lvx-blue hover:text-lvx-blue-hover premium-transition">
                  Visit Patent Profile <ExternalLink className="h-3 w-3" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Technologies ── */}
      <section className="px-6 py-20 lg:py-28 bg-lvx-surface dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <LvxSectionLabel>Marketplace Spotlight</LvxSectionLabel>
              <LvxHeading line1="Featured" line2="Technologies" />
            </div>
            <motion.div {...fadeUp}>
              <Link to="/marketplace" className="text-sm font-semibold text-lvx-blue hover:text-lvx-blue-hover flex items-center gap-1.5 premium-transition">
                View all patents <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {(realPatents.length > 0 ? realPatents.slice(0, 3) : featuredPatents).map((p, idx) => (
              <motion.div
                key={p._id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="flex flex-col"
              >
                <PatentCard
                  patent={p}
                  isSaved={false}
                  onToggleBookmark={() => {}}
                  onExplore={(id) => navigate(`/marketplace/${id}`)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="px-6 py-24 lg:py-28 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <LvxSectionLabel>Comparative Advantage</LvxSectionLabel>
            <LvxHeading line1="PatentBridge vs." line2="Traditional Registries" />
            <motion.p
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.15 }}
              className="text-lvx-charcoal/60 dark:text-zinc-400 text-sm sm:text-[15px] mt-5 leading-relaxed"
            >
              Conventional IP databases are designed for lawyers. PatentBridge is built for developers, product managers, and strategic acquirers.
            </motion.p>
          </div>

          <div className="overflow-x-auto rounded-sm border border-zinc-200 dark:border-zinc-800 shadow-premium-md bg-white dark:bg-zinc-900">
            <table className="w-full border-collapse text-left text-sm min-w-[650px]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
                  <th className="p-6 font-bold text-zinc-900 dark:text-zinc-200">Key Feature</th>
                  <th className="p-6 font-bold text-lvx-navy dark:text-lvx-blue bg-lvx-blue/5 border-x border-zinc-200 dark:border-zinc-800">
                    PatentBridge (AI Powered)
                  </th>
                  <th className="p-6 font-bold text-zinc-500 dark:text-zinc-400">Traditional Registries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {[
                  {
                    feature: 'Language & Briefs',
                    ours: ['AI-generated 2-line commercial briefs', 'Readily decodable for non-legal product leaders.'],
                    theirs: ['Hundreds of pages of complex legal jargon', 'Requires dedicated IP attorneys to audit and review.'],
                  },
                  {
                    feature: 'Search & Match',
                    ours: ['AI Semantic search with % relevance match', 'Matches intention, context, and potential use cases.'],
                    theirs: ['Strict keyword queries or filing codes', 'Misses key synonyms, application areas, and overlap.'],
                  },
                  {
                    feature: 'Speed to Contact',
                    ours: ['Instant scheduling & calendar sync', 'Contact the direct owner within 1.8 days average.'],
                    theirs: ['Weeks of opaque broker back-and-forth', 'Blind listings, inactive contacts, slow response times.'],
                  },
                  {
                    feature: 'Fee Transparency',
                    ours: ['Flat SaaS subscription models', 'No deal brokerage commissions or success fees.'],
                    theirs: ['10% - 25% broker transactional cut', 'Large upfront setup costs and hidden commission overheads.'],
                  },
                ].map((row) => (
                  <tr key={row.feature}>
                    <td className="p-6 font-semibold text-zinc-900 dark:text-zinc-200 text-sm">{row.feature}</td>
                    <td className="p-6 bg-lvx-blue/5 border-x border-zinc-200 dark:border-zinc-800">
                      <span className="font-bold block text-lvx-blue text-sm">{row.ours[0]}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{row.ours[1]}</span>
                    </td>
                    <td className="p-6 text-zinc-500 dark:text-zinc-400">
                      <span className="block font-medium text-sm">{row.theirs[0]}</span>
                      <span className="text-xs">{row.theirs[1]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="px-6 py-24 lg:py-28 bg-lvx-surface dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mb-20">
            <LvxSectionLabel>How It Works</LvxSectionLabel>
            <LvxHeading line1="Commercialization" line2="in 3 Steps" />
            <motion.p
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.15 }}
              className="text-lvx-charcoal/60 dark:text-zinc-400 text-sm mt-5 leading-relaxed"
            >
              We replace outdated paper files and slow legal procedures with a modern digital pipeline.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              { step: '01', title: 'Register & Upload', desc: 'Inventors input their patent number and documentation. Our platform validates the filing status against active global patent registries.' },
              { step: '02', title: 'AI Intelligence Engine', desc: 'Our parsing model processes the target claims to extract core innovations, identify concrete commercial use cases, and output a Commercial Potential Score.' },
              { step: '03', title: 'Direct Commercial Lead', desc: 'Buyers query listings with search strings, explore the summarized business briefs, and book verified video meeting invites directly with the inventor.' },
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <div className="text-6xl font-bold text-lvx-blue/12 dark:text-zinc-800 select-none tracking-headinger">{item.step}</div>
                <h3 className="font-bold text-lvx-charcoal dark:text-white text-lg tracking-heading">{item.title}</h3>
                <p className="text-sm text-lvx-charcoal/60 dark:text-zinc-400 leading-[1.7]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Intelligence ── */}
      <section className="px-6 py-24 lg:py-28 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <LvxSectionLabel>Dynamic Intel Engine</LvxSectionLabel>
            <LvxHeading
              line1="Unlock the latent value"
              line2="in complex legal documents"
            />
            <motion.p
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.15 }}
              className="text-lvx-charcoal/60 dark:text-zinc-400 text-sm mt-5 mb-6 leading-[1.7]"
            >
              Standard patent listings are written to satisfy legal standards. PatentBridge extracts actionable business intelligence:
            </motion.p>
            <ul className="space-y-3.5">
              {[
                'High-level commercial summaries for product teams',
                'Predefined industry classification taxonomy',
                'Viable business use cases and target adoption models',
                'Visual Commercial Potential Score from 0 to 100',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                  <CheckCircle2 className="h-5 w-5 text-lvx-blue shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-6 shadow-premium-md">
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4">
              <div className="h-3 w-3 bg-red-400 rounded-full" />
              <div className="h-3 w-3 bg-amber-400 rounded-full" />
              <div className="h-3 w-3 bg-emerald-400 rounded-full" />
              <span className="text-xs text-zinc-400 font-mono ml-2">patent_brief_ai_analyzer.json</span>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-label">Target Problem Solved</h4>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1 font-semibold">"Traditional battery modules overheat during high-speed charging, cutting lifespans."</p>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-label">Key Technological Claims</h4>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1 font-semibold">"Phase-change polymer lattices arranged parallel to electric cell contact vectors."</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-label">Commercial Score</h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xl font-bold text-lvx-navy dark:text-white">85%</span>
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/35 dark:text-emerald-400 px-1.5 py-0.5 rounded">High Potential</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-label">Keywords</h4>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">solid-state, thermoregulator, polymer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="px-6 py-24 lg:py-28 bg-lvx-surface dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-xl mx-auto text-center mb-16">
            <LvxSectionLabel>Real People, Real Stories</LvxSectionLabel>
            <LvxHeading line1="Trusted by Researchers" line2="and Acquirers" className="text-center" />
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                quote: "Listing our university's solid-state battery portfolio on PatentBridge resulted in 4 qualified inquiries in under 3 weeks. We finalized a manufacturing license with an EV developer in under 2 months.",
                initials: 'MH',
                name: 'Dr. Michael Hanes',
                role: 'Director of Technology Transfer, TechLabs',
              },
              {
                quote: "As an early-stage incubator looking for target intellectual property, scrolling through legal registries was impossible. PatentBridge's AI summary metrics let our technical team verify candidates instantly.",
                initials: 'EL',
                name: 'Evelyn Laurent',
                role: 'Managing Partner, Helix Ventures',
              },
            ].map((t, idx) => (
              <motion.div
                key={t.initials}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="p-8 border border-zinc-200/80 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900 flex flex-col justify-between space-y-6"
              >
                <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-lvx-blue/10 text-lvx-blue rounded-full flex items-center justify-center font-bold text-xs">
                    {t.initials}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-lvx-charcoal dark:text-zinc-200">{t.name}</h4>
                    <p className="text-[10px] text-lvx-charcoal/50">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="lvx-hero-bg text-white px-6 py-24 lg:py-28 text-center">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mx-auto space-y-8"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-display leading-tight">
            Ready to Commercialize Your Innovation?
          </h2>
          <p className="text-white/60 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            Get your patents indexed, analyzed, and in front of venture capital leads and corporate acquirers within minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/marketplace">
              <button className="lvx-cta-btn min-w-[200px]">Explore Technology Directory</button>
            </Link>
            <Link to="/auth?register=true&role=owner">
              <button className="px-6 py-3.5 text-xs font-bold tracking-label uppercase border border-white/25 text-white rounded-sm hover:bg-white/10 premium-transition min-w-[200px]">
                List a Patent
              </button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-lvx-navy-light border-t border-white/5 py-12 px-6 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <BrandLogo variant="monogram" linkTo="/" imgClassName="h-10 w-10" />
              <div>
                <span className="font-bold text-sm text-white block">PatentBridge</span>
                <span className="text-[10px] text-white/40 uppercase tracking-label">IP Marketplace</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-xs text-white/50">
              <Link to="/#about" className="hover:text-white premium-transition">About Us</Link>
              <Link to="/marketplace" className="hover:text-white premium-transition">Marketplace</Link>
              <Link to="/auth?register=true&role=owner" className="hover:text-white premium-transition">For Inventors</Link>
              <Link to="/auth?register=true&role=buyer" className="hover:text-white premium-transition">For Buyers</Link>
              <Link to="/auth?mode=login" className="hover:text-white premium-transition">Login</Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-[11px] text-white/30 text-center sm:text-left">
            © {new Date().getFullYear()} PatentBridge Technologies Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
