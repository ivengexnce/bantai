'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  className
}: DialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop (Solid non-glass overlay, no purple/black) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0d1117]/85"
          />

          {/* Modal Container (Soft corner radius, crisp borders, zero drop shadows) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={cn(
              'relative z-10 w-full max-w-lg border border-[#2b3648] bg-[#121722] p-6 text-[#d4d6db] font-mono text-xs rounded-2xl',
              className
            )}
          >
            {/* Header */}
            {(title || description) && (
              <div className="border-b border-[#20232b] pb-3 mb-4 flex items-start justify-between">
                <div>
                  {title && (
                    <h2 className="text-sm font-bold text-[#f0f2f5] uppercase tracking-wider">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="text-[11px] text-[#8c919e] mt-0.5">{description}</p>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="text-[#8c919e] hover:text-[#f0f2f5] px-2 py-0.5 border border-[#20232b] hover:border-[#3a4050] text-[10px] uppercase font-bold"
                >
                  [ESC / X]
                </button>
              </div>
            )}

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
