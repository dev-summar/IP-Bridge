import React from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { easeOut } from '../../utils/motion';

/**
 * Route transitions — use location.key so browser back/forward remounts correctly.
 * Avoid mode="wait"; it can leave the page stuck at opacity 0 after POP navigation.
 */
export const PageTransition = () => {
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={location.key}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12, ease: easeOut }}
        className="min-h-0"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
};
