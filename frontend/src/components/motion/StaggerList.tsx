import React from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '../../utils/motion';
import { cn } from '../../utils/cn';

interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'ul' | 'section';
  /** Set false to skip hidden→visible stagger (avoids blank list on remount/back nav). */
  animateOnMount?: boolean;
}

export const StaggerList: React.FC<StaggerListProps> = ({
  children,
  className,
  as = 'div',
  animateOnMount = true,
}) => {
  const Component = motion[as];

  return (
    <Component
      variants={staggerContainer}
      initial={animateOnMount ? 'hidden' : false}
      animate="visible"
      className={cn(className)}
    >
      {children}
    </Component>
  );
};

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'li' | 'article';
}

export const StaggerItem: React.FC<StaggerItemProps> = ({ children, className, as = 'div' }) => {
  const Component = motion[as];

  return (
    <Component variants={staggerItem} className={cn(className)}>
      {children}
    </Component>
  );
};
