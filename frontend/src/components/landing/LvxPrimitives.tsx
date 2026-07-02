import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';

export const lvxEase = [0.16, 1, 0.3, 1] as const;

export const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' as const },
  transition: { duration: 0.65, ease: lvxEase },
};

export const slideInContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

export const slideInItem = {
  hidden: { opacity: 0, x: -48 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: lvxEase },
  },
};

export const LvxSectionLabel = ({ children }: { children: React.ReactNode }) => (
  <motion.div {...fadeUp} className="flex items-center gap-4 mb-5">
    <span className="text-[11px] font-semibold uppercase tracking-label text-lvx-label shrink-0">
      {children}
    </span>
    <span className="lvx-label-line flex-1 max-w-[200px] h-px" aria-hidden />
  </motion.div>
);

export const LvxHeading = ({
  line1,
  line2,
  className = '',
}: {
  line1: string;
  line2?: string;
  className?: string;
}) => (
  <motion.h2
    {...fadeUp}
    transition={{ ...fadeUp.transition, delay: 0.08 }}
    className={`text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-lvx-charcoal dark:text-white tracking-display leading-[1.12] ${className}`}
  >
    {line1}
    {line2 && (
      <>
        <br />
        {line2}
      </>
    )}
  </motion.h2>
);

export const LvxExploreButton = ({ to, label = 'Explore' }: { to: string; label?: string }) => (
  <Link to={to} className="lvx-explore-btn group inline-flex items-center gap-2.5 mt-8">
    <span>{label}</span>
    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
  </Link>
);

interface EcosystemCardProps {
  brandAccent: string;
  title: string;
  description: string;
  exploreLink: string;
  delay?: number;
}

export const EcosystemCard = ({
  brandAccent,
  title,
  description,
  exploreLink,
  delay = 0,
}: EcosystemCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 32 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.7, delay, ease: lvxEase }}
    className="lvx-peach-card rounded-tl-[2rem] rounded-br-lg rounded-tr-lg rounded-bl-lg overflow-hidden"
  >
    <div className="p-8 sm:p-10 lg:p-12">
      <div className="flex flex-col justify-center max-w-md">
        <div className="flex items-center mb-6 min-w-0">
          <BrandLogo size="sm" linkTo={false} />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-lvx-charcoal dark:text-white tracking-heading mb-4 leading-snug">
          {title}
        </h3>
        <p className="text-sm sm:text-[15px] text-lvx-charcoal/75 dark:text-zinc-400 leading-[1.7] font-normal">
          {description}
        </p>
        <LvxExploreButton to={exploreLink} />
      </div>
    </div>
  </motion.div>
);
