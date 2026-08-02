'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/components/lib/cn';

const STEPS = ['Upload', 'Validate', 'Review', 'Send', 'Report'];

export function WorkflowTimeline({ activeStep }: { activeStep: number }) {
  return (
    <div className="glass-panel flex items-center gap-1 overflow-x-auto rounded-xl2 p-2.5 shadow-soft sm:gap-2">
      {STEPS.map((step, i) => {
        const state = i < activeStep ? 'done' : i === activeStep ? 'active' : 'upcoming';
        return (
          <div key={step} className="flex flex-1 items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-2 whitespace-nowrap px-1.5">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
                  state === 'done' && 'bg-accent-500 text-white',
                  state === 'active' && 'bg-secondary-500 text-white',
                  state === 'upcoming' && 'bg-primary-50 text-primary-300'
                )}
              >
                {state === 'done' ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-xs font-semibold',
                  state === 'upcoming' ? 'text-primary-300' : 'text-primary-700'
                )}
              >
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="h-0.5 flex-1 rounded-full bg-primary-50">
                <motion.div
                  className="h-full rounded-full bg-accent-400"
                  initial={{ width: 0 }}
                  animate={{ width: i < activeStep ? '100%' : '0%' }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}