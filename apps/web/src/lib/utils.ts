import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Motion Design System Tokens
export const MOTION_TRANSITIONS = {
  instant: { duration: 0.1, ease: [0.16, 1, 0.3, 1] },
  snappy: { duration: 0.2, ease: [0.25, 1, 0.5, 1] },
  smooth: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  stately: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  spring: { type: 'spring', damping: 25, stiffness: 350 },
  gentleSpring: { type: 'spring', damping: 30, stiffness: 200 }
} as const;

export const FADE_IN_UP = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: MOTION_TRANSITIONS.snappy
};

export const STAGGER_CONTAINER = {
  animate: {
    transition: {
      staggerChildren: 0.06
    }
  }
};
