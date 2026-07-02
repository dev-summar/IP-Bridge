import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { fadeUpVariants, transition } from '../../utils/motion';
import { cn } from '../../utils/cn';

interface FadeInProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  className,
  delay = 0,
  once = true,
  ...props
}) => (
  <motion.div
    variants={fadeUpVariants}
    initial="hidden"
    whileInView="visible"
    viewport={{ once, margin: '-40px' }}
    transition={{ ...transition, delay }}
    className={cn(className)}
    {...props}
  >
    {children}
  </motion.div>
);
