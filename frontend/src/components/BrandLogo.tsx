import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../utils/cn';

/** IPBridge horizontal lockup — `frontend/ipbridge-final.png` (transparent PNG) */
export const LOGO_SRC = '/branding/ipbridge-logo.png?v=2';

export type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** @deprecated Kept for call-site compat — all variants use the same lockup */
export type BrandLogoVariant = 'monogram' | 'wordmark' | 'full' | 'stacked';

const SIZE_CLASS: Record<BrandLogoSize, string> = {
  xs: 'h-7 max-w-[min(120px,40vw)]',
  sm: 'h-8 max-w-[min(144px,44vw)]',
  md: 'h-9 max-w-[min(168px,48vw)]',
  lg: 'h-10 sm:h-11 max-w-[min(200px,54vw)]',
  xl: 'h-11 sm:h-12 max-w-[min(232px,64vw)]',
};

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
  imgClassName,
  linkTo = '/',
  priority = false,
}: BrandLogoProps) => {
  const logo = (
    <img
      src={LOGO_SRC}
      alt="IPBridge — Intelligent IP Trading Platform"
      width={220}
      height={48}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      className={cn(
        'w-auto object-contain object-left select-none',
        SIZE_CLASS[size],
        imgClassName
      )}
      draggable={false}
    />
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
        'premium-transition rounded-md opacity-95 hover:opacity-100 hover:scale-[1.02] active:scale-[0.99]'
      )}
    >
      {logo}
    </Link>
  );
};
