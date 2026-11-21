'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-mono font-bold uppercase tracking-wider select-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#cc8e25] disabled:opacity-40 disabled:pointer-events-none rounded-none';

    const variants = {
      primary:
        'bg-[#cc8e25] hover:bg-[#b06f1d] active:bg-[#9a5d14] text-black border border-[#cc8e25]',
      secondary:
        'bg-[#181b22] hover:bg-[#20242f] active:bg-[#12141a] text-[#f0f2f5] border border-[#2b303c]',
      outline:
        'bg-transparent hover:bg-[#181b22] text-[#d4d6db] hover:text-[#f0f2f5] border border-[#2b303c] hover:border-[#404656]',
      danger:
        'bg-[#2a1315] hover:bg-[#3d181c] text-red-400 border border-red-500/40 hover:border-red-500',
      ghost:
        'bg-transparent hover:bg-[#181b22] text-[#8c919e] hover:text-[#f0f2f5] border border-transparent'
    };

    const sizes = {
      sm: 'px-2.5 py-1 text-[10px] gap-1.5',
      md: 'px-4 py-2 text-xs gap-2',
      lg: 'px-6 py-3 text-xs gap-2.5'
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        transition={{ duration: 0.1 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <span className="w-3 h-3 border-2 border-current border-t-transparent animate-spin inline-block" />
        )}
        {!isLoading && leftIcon && <span>{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span>{rightIcon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
