import type { Transition, Variants } from 'framer-motion';

/** Shared easing — smooth deceleration (Linear / Stripe style) */
export const easeOut = [0.16, 1, 0.3, 1] as const;

export const springSnappy = { type: 'spring', stiffness: 420, damping: 32 } as const;

export const springSoft = { type: 'spring', stiffness: 260, damping: 28 } as const;

export const duration = {
  fast: 0.2,
  normal: 0.35,
  slow: 0.55,
} as const;

export const transition: Transition = {
  duration: duration.normal,
  ease: easeOut,
};

/** Page enter/exit */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

/** Scroll-reveal fade up */
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/** Stagger container */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: easeOut },
  },
};

/** List rows (discover results) */
export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: duration.normal, ease: easeOut },
  }),
};

/** Tab / section content swap */
export const contentSwap: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

/** Subtle hover for interactive rows */
export const rowHover = {
  whileHover: { x: 4 },
  whileTap: { scale: 0.995 },
  transition: springSnappy,
};

/** Respect prefers-reduced-motion */
export function motionProps<T extends Record<string, unknown>>(props: T): T {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return {} as T;
  }
  return props;
}
