'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[#1e2736] border border-[#2b3648]/40',
        className
      )}
      {...props}
    />
  );
}

export function SkeletonMessageGroup() {
  return (
    <div className="space-y-3 p-4 rounded-xl border border-[#2b3648] bg-[#111620]">
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded-full" />
        <Skeleton className="w-32 h-3" />
        <Skeleton className="w-16 h-3 ml-auto" />
      </div>
      <div className="space-y-2 pt-1">
        <Skeleton className="w-full h-3.5" />
        <Skeleton className="w-5/6 h-3.5" />
        <Skeleton className="w-3/4 h-3.5" />
      </div>
      <div className="pt-2 flex items-center gap-2">
        <Skeleton className="w-20 h-5 rounded-md" />
        <Skeleton className="w-24 h-5 rounded-md" />
      </div>
    </div>
  );
}
