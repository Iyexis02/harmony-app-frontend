/**
 * Shared Framer Motion presets.
 *
 * All list/stagger presets are parameterized so different pages can
 * preserve their intentional timing differences while sharing the pattern.
 *
 * What is NOT here (intentionally left local):
 *  - StepTransition spring physics (unique spring config)
 *  - Profile photo carousel (micro-interaction tuning)
 *  - Profile score bar width animation (unique width-based animation)
 */

import type { Variants } from 'framer-motion';

// ---------------------------------------------------------------------------
// List animations
// ---------------------------------------------------------------------------

/**
 * Stagger container — wraps a list; children animate in sequence.
 * @param staggerDelay ms between each child (matches: 0.05, analytics: 0.08)
 */
export const staggerContainer = (staggerDelay = 0.05): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: staggerDelay } },
});

/**
 * Fade-in-up item — used as child of staggerContainer.
 * @param y    vertical offset to animate from (matches: 20, analytics: 24)
 * @param duration animation duration in seconds (matches: 0.3, analytics: 0.35)
 */
export const fadeInUp = (y = 20, duration = 0.3): Variants => ({
  hidden: { opacity: 0, y },
  show: { opacity: 1, y: 0, transition: { duration } },
});

// ---------------------------------------------------------------------------
// Swipe card exit
// ---------------------------------------------------------------------------

/** Shared exit easing curve — ease-in cubic. */
export const EXIT_TRANSITION = { duration: 0.3, ease: [0.4, 0, 1, 1] as const };

type ExitDirection = 'left' | 'right' | 'up' | null;

/**
 * Card exit animation object — pass directly to `exit={}` on a motion element.
 * Includes both the target position and the EXIT_TRANSITION timing.
 */
export const cardExit = (direction: ExitDirection) => {
  switch (direction) {
    case 'right':
      return { x: 500, rotate: 15, opacity: 0, transition: EXIT_TRANSITION };
    case 'left':
      return { x: -500, rotate: -15, opacity: 0, transition: EXIT_TRANSITION };
    case 'up':
      return { y: -500, opacity: 0, transition: EXIT_TRANSITION };
    default:
      return { opacity: 0, transition: { duration: 0.2 } };
  }
};
