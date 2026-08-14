'use client';

import { Check } from 'lucide-react';
import { cn } from '@/components/lib/cn';

const STEPS = ['Upload', 'Validate', 'Review', 'Send', 'Report'];

export function WorkflowTimeline({ activeStep }: { activeStep: number }) {
  return (
    <div className="glass-panel grid grid-cols-5 gap-1 rounded-xl2 p-2 shadow-soft">
      {STEPS.map((step, i) => {
        const state = i < activeStep ? 'done' : i === activeStep ? 'active' : 'upcoming';
        return (
          <div key={step} className="flex items-center gap-1.5 px-1">
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
                'hidden text-xs font-semibold sm:inline',
                state === 'upcoming' ? 'text-primary-300' : 'text-primary-700'
              )}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}