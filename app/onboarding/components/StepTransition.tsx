'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  direction: 'forward' | 'backward';
};

export default function StepTransition({ children, direction }: Props) {
  const variants = {
    enter: (dir: 'forward' | 'backward') => ({
      x: dir === 'forward' ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: 'forward' | 'backward') => ({
      x: dir === 'forward' ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence mode="sync" custom={direction}>
      <motion.div
        key={children?.toString()}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
        className="w-full max-w-2xl"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
