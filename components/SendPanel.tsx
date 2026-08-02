'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Mail } from 'lucide-react';
import type { SendProgressEvent } from '@/types';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatCounter } from '@/components/ui/stat-counter';

interface SendPanelProps {
  validCount: number;
  sending: boolean;
  progress: SendProgressEvent | null;
  onSend: () => void;
}

export default function SendPanel({ validCount, sending, progress, onSend }: SendPanelProps) {
  return (
    <Card delay={0.15}>
      <CardHeader
        eyebrow="Step 4"
        title="Send Emails"
        description="Sequential, rate-limited delivery through Zoho Mail"
        icon={<Send className="h-5 w-5" aria-hidden="true" />}
      />

      <AnimatePresence mode="wait">
        {!sending ? (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button variant="secondary" size="lg" onClick={onSend} disabled={validCount === 0}>
              <Send className="h-4 w-4" aria-hidden="true" />
              Send Emails ({validCount})
            </Button>
            {validCount === 0 && (
              <p className="mt-2.5 text-sm text-primary-400">No valid emails available to send to.</p>
            )}
          </motion.div>
        ) : (
          <motion.div key="sending" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <ProgressBar percentage={progress?.percentage ?? 0} />

            <div className="grid grid-cols-3 gap-3 text-center sm:gap-4">
              <div className="rounded-xl2 bg-primary-50 py-3">
                <div className="font-heading text-2xl text-primary-700">
                  <StatCounter value={progress?.processed ?? 0} duration={0.3} />
                </div>
                <div className="text-[11px] uppercase tracking-wide text-primary-400">Processed</div>
              </div>
              <div className="rounded-xl2 bg-secondary-50 py-3">
                <div className="font-heading text-2xl text-secondary-700">
                  <StatCounter value={progress?.remaining ?? 0} duration={0.3} />
                </div>
                <div className="text-[11px] uppercase tracking-wide text-secondary-500">Remaining</div>
              </div>
              <div className="rounded-xl2 bg-accent-100 py-3">
                <div className="font-heading text-2xl text-accent-700">{progress?.percentage ?? 0}%</div>
                <div className="text-[11px] uppercase tracking-wide text-accent-600">Complete</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl2 border border-primary-100 bg-white/70 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-100 text-secondary-600">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-primary-800">{progress?.status ?? 'Sending\u2026'}</p>
                {progress?.currentEmail && (
                  <p className="flex items-center gap-1 truncate text-xs text-primary-400">
                    <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {progress.currentEmail}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}