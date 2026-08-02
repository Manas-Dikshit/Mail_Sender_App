'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { StatCounter } from '@/components/ui/stat-counter';
import { cn } from '@/components/lib/cn';

const TONE_TEXT = {
  primary: 'text-primary-700',
  secondary: 'text-secondary-600',
  accent: 'text-accent-700',
  critical: 'text-primary-900',
} as const;

const TONE_ICON_BG = {
  primary: 'bg-primary-100 text-primary-600',
  secondary: 'bg-secondary-100 text-secondary-600',
  accent: 'bg-accent-100 text-accent-700',
  critical: 'bg-primary-100 text-primary-800',
} as const;

export function StatCard({
  label,
  value,
  icon,
  tone = 'primary',
  index = 0,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone?: keyof typeof TONE_TEXT;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="rounded-xl2 border border-primary-100/70 bg-white/80 p-4 shadow-soft backdrop-blur"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary-400">{label}</span>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', TONE_ICON_BG[tone])}>
          {icon}
        </span>
      </div>
      <div className={cn('mt-2 font-heading text-3xl', TONE_TEXT[tone])}>
        <StatCounter value={value} />
      </div>
    </motion.div>
  );
}