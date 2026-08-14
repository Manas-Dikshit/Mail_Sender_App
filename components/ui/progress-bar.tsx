'use client';

import { motion } from 'framer-motion';
import { cn } from '@/components/lib/cn';

export function ProgressBar({ percentage, className }: { percentage: number; className?: string }) {
  const clamped = Math.min(100, Math.max(0, percentage));
  return (
    <div
      className={cn('relative h-3 w-full overflow-hidden rounded-full bg-primary-50', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full rounded-full bg-secondary-500"
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      />
    </div>
  );
}