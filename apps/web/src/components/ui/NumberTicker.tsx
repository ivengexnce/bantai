'use client';

import React, { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface NumberTickerProps {
  value: number;
  direction?: 'up' | 'down';
  className?: string;
  decimalPlaces?: number;
}

export function NumberTicker({
  value,
  direction = 'up',
  className,
  decimalPlaces = 0
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === 'down' ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100
  });
  const isInView = useInView(ref, { once: true, margin: '0px' });

  useEffect(() => {
    if (isInView) {
      motionValue.set(direction === 'down' ? 0 : value);
    }
  }, [motionValue, isInView, direction, value]);

  useEffect(
    () =>
      springValue.on('change', (latest) => {
        if (ref.current) {
          ref.current.textContent = Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces
          }).format(Number(latest.toFixed(decimalPlaces)));
        }
      }),
    [springValue, decimalPlaces]
  );

  return (
    <span
      className={cn('inline-block tabular-nums font-mono', className)}
      ref={ref}
    >
      {direction === 'down' ? value : 0}
    </span>
  );
}
