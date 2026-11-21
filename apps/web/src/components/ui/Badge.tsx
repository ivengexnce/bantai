import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant =
  | 'default'
  | 'amber'
  | 'emerald'
  | 'crimson'
  | 'muted'
  | 'warning'
  | 'success'
  | 'danger'
  | 'neutral'
  | 'info';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  pulse?: boolean;
}

export function Badge({
  className,
  variant = 'default',
  pulse = false,
  children,
  ...props
}: BadgeProps) {
  const normalizedVariant: 'default' | 'amber' | 'emerald' | 'crimson' | 'muted' =
    variant === 'warning'
      ? 'amber'
      : variant === 'success'
      ? 'emerald'
      : variant === 'danger'
      ? 'crimson'
      : variant === 'neutral' || variant === 'info'
      ? 'muted'
      : variant;

  const variants = {
    default: 'bg-[#181b22] text-[#d4d6db] border-[#2b303c]',
    amber: 'bg-[#1e1910] text-[#cc8e25] border-[#cc8e25]/50',
    emerald: 'bg-[#0e1d16] text-[#10b981] border-[#10b981]/50',
    crimson: 'bg-[#241012] text-red-400 border-red-500/40',
    muted: 'bg-[#12141a] text-[#8c919e] border-[#20232b]'
  };

  const pulseColors = {
    default: 'bg-[#8c919e]',
    amber: 'bg-[#cc8e25]',
    emerald: 'bg-[#10b981]',
    crimson: 'bg-red-400',
    muted: 'bg-[#5a6070]'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider border rounded-none select-none',
        variants[normalizedVariant],
        className
      )}
      {...props}
    >
      {pulse && (
        <span
          className={cn(
            'w-1.5 h-1.5 inline-block animate-pulse',
            pulseColors[normalizedVariant]
          )}
        />
      )}
      {children}
    </span>
  );
}
