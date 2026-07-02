import React, { useId } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../utils/cn';

export type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** @deprecated Kept for call-site compat — all variants use the same lockup */
export type BrandLogoVariant = 'monogram' | 'wordmark' | 'full' | 'stacked';

const MARK_SIZE: Record<BrandLogoSize, string> = {
  xs: 'h-5 w-5',
  sm: 'h-6 w-6',
  md: 'h-7 w-7',
  lg: 'h-8 w-8',
  xl: 'h-9 w-9',
};

const TEXT_SIZE: Record<BrandLogoSize, string> = {
  xs: 'text-sm',
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
};

function BridgeMark({ className, gradientId }: { className?: string; gradientId: string }) {
  return (
    <svg
      viewBox="0 0 40 32"
      className={className}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 26V17.5C3 17.5 8 9 20 9C32 9 37 17.5 37 17.5V26"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M3 17.5H37"
        stroke="#1e40af"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="7" y="19" width="4.5" height="7" rx="1" fill="#2563eb" />
      <rect x="28.5" y="19" width="4.5" height="7" rx="1" fill="#2563eb" />
      <path
        d="M6 27.5C10 25.5 14 27 20 27C26 27 30 25.5 34 27.5"
        stroke="#93c5fd"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.85"
      />
      <defs>
        <linearGradient id={gradientId} x1="20" y1="9" x2="20" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7dd3fc" />
          <stop offset="0.55" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  className?: string;
  imgClassName?: string;
  linkTo?: string | false;
  priority?: boolean;
}

export const BrandLogo = ({
  size = 'md',
  className,
  linkTo = '/',
}: BrandLogoProps) => {
  const gradientId = useId().replace(/:/g, '');

  const logo = (
    <span className="inline-flex items-center gap-2 min-w-0">
      <BridgeMark className={cn('shrink-0', MARK_SIZE[size])} gradientId={gradientId} />
      <span
        className={cn(
          'font-bold tracking-tight leading-none whitespace-nowrap',
          TEXT_SIZE[size]
        )}
      >
        <span className="text-lvx-blue">IP</span>
        <span className="text-lvx-navy dark:text-zinc-100">Bridge</span>
      </span>
    </span>
  );

  const wrapperClass = cn('inline-flex items-center shrink-0 min-w-0', className);

  if (linkTo === false) {
    return <div className={wrapperClass}>{logo}</div>;
  }

  return (
    <Link
      to={linkTo}
      aria-label="IPBridge home"
      className={cn(
        wrapperClass,
        'premium-transition rounded-md opacity-95 hover:opacity-100 active:scale-[0.99]'
      )}
    >
      {logo}
    </Link>
  );
};
