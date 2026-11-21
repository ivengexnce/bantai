'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  color?: string;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

/**
 * Magic UI-inspired High-Performance Border Beam.
 * Sweeps a subtle technical beam along the container's rectangular perimeter.
 * Automatically disabled under prefers-reduced-motion.
 */
export function BorderBeam({
  className,
  size = 120,
  duration = 8,
  borderWidth = 1,
  color,
  colorFrom = '#cc8e25',
  colorTo = 'transparent',
  delay = 0
}: BorderBeamProps) {
  const actualColorFrom = color || colorFrom;
  const actualColorTo = color ? 'transparent' : colorTo;

  return (
    <div
      style={
        {
          '--size': `${size}px`,
          '--duration': `${duration}s`,
          '--border-width': `${borderWidth}px`,
          '--color-from': actualColorFrom,
          '--color-to': actualColorTo,
          '--delay': `-${delay}s`
        } as React.CSSProperties
      }
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent]',
        // Mask to clip only along the border
        '![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]',
        // Pseudo element sweep
        'after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] after:animate-border-beam after:[animation-delay:var(--delay)] after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] after:[offset-anchor:calc(var(--size)*1px)_50%] after:[offset-path:rect(0_auto_auto_0_round_0)]',
        'motion-reduce:hidden',
        className
      )}
    />
  );
}
