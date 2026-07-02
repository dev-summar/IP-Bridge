import React from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { easeOut } from '../../utils/motion';

/**
 * Route transitions — must use useOutlet() (not <Outlet />) so AnimatePresence
 * keeps the exiting page mounted until the animation finishes.
 */
export const PageTransition = () => {
  const location = useLocation();
  const outlet = useOutlet();

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? ('instant' as ScrollBehavior) : 'auto' });
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: easeOut }}
        className="min-h-0"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
};
