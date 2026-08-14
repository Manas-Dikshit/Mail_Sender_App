'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  delay?: number;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, glow, delay = 0, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'glass-panel relative overflow-hidden rounded-xl3 p-6 shadow-card',
          glow && 'shadow-glow',
          className
        )}
        {...(props as any)}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-secondary-400" />
        <div className="relative">{children}</div>
      </motion.div>
    );
  }
);
Card.displayName = 'Card';

export function CardHeader({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      {icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl2 bg-secondary-100 text-secondary-700 shadow-soft">
          {icon}
        </div>
      )}
      <div>
        {eyebrow && (
          <p className="mb-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-secondary-600">
            {eyebrow}
          </p>
        )}
        <h2 className="text-lg font-semibold text-primary-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-primary-500">{description}</p>}
      </div>
    </div>
  );
}

export { Card };