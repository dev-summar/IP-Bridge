import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../utils/cn';

const MONOGRAM_SRC = '/branding/monogram-light.png';
const WORDMARK_SRC = '/branding/wordmark-light.png';

type BrandLogoVariant = 'monogram' | 'wordmark' | 'full' | 'stacked';

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  imgClassName?: string;
  linkTo?: string | false;
}

export const BrandLogo = ({
  variant = 'full',
  className,
  imgClassName,
  linkTo = '/',
}: BrandLogoProps) => {
  const images =
    variant === 'stacked' ? (
      <div className="flex flex-col leading-none">
        <span className="text-[1.6rem] font-bold tracking-heading text-white">
          P<span className="text-lvx-blue">B</span>
        </span>
        <span className="text-[11px] font-normal text-white/70 mt-1 tracking-wide">
          PatentBridge
        </span>
      </div>
    ) : variant === 'monogram' ? (
      <img
        src={MONOGRAM_SRC}
        alt="PatentBridge"
        className={cn('h-9 w-9 object-contain', imgClassName)}
        draggable={false}
      />
    ) : variant === 'wordmark' ? (
      <img
        src={WORDMARK_SRC}
        alt="PatentBridge — IP Marketplace"
        className={cn('h-9 w-auto object-contain', imgClassName)}
        draggable={false}
      />
    ) : (
      <>
        <img
          src={MONOGRAM_SRC}
          alt="PatentBridge"
          className={cn('h-9 w-9 object-contain sm:hidden', imgClassName)}
          draggable={false}
        />
        <img
          src={WORDMARK_SRC}
          alt="PatentBridge — IP Marketplace"
          className={cn('hidden sm:block h-9 w-auto object-contain', imgClassName)}
          draggable={false}
        />
      </>
    );

  const wrapperClass = cn('inline-flex items-center shrink-0', className);

  if (linkTo === false) {
    return <div className={wrapperClass}>{images}</div>;
  }

  return (
    <Link to={linkTo} className={cn(wrapperClass, 'premium-transition opacity-95 hover:opacity-100')}>
      {images}
    </Link>
  );
};
