'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  badge?: string;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  className?: string;
  layoutId?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className,
  layoutId = 'active-tab-indicator'
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center border border-[#20232b] bg-[#0e1014] p-0.5 font-mono text-xs select-none',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative px-3 py-1.5 font-bold uppercase transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#cc8e25] text-[11px]',
              isActive ? 'text-black' : 'text-[#8c919e] hover:text-[#f0f2f5]'
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                className="absolute inset-0 bg-[#cc8e25]"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={cn(
                    'text-[9px] px-1 py-0.2 border',
                    isActive
                      ? 'bg-black text-[#cc8e25] border-black'
                      : 'bg-[#181b22] text-[#8c919e] border-[#2b303c]'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
