'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Mail, User, MessageSquare } from 'lucide-react';
import type { SendProgressEvent } from '@/types';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatCounter } from '@/components/ui/stat-counter';

export interface ComposePayload {
  senderName: string;
  subject: string;
  content: string;
}

interface SendPanelProps {
  validCount: number;
  sending: boolean;
  progress: SendProgressEvent | null;
  onSend: (payload: ComposePayload) => void;
}

const FIELD_CLASS =
  'block w-full rounded-xl2 border-2 border-primary-100 bg-white/80 px-3.5 py-2.5 text-sm text-primary-900 shadow-soft outline-none transition placeholder:text-primary-300 focus:border-secondary-400';

function Field({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon: typeof User;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary-500"
      >
        <Icon className="h-3.5 w-3.5 text-secondary-500" aria-hidden="true" />
        {label}
      </label>
      {children}
    </div>
  );
}

export default function SendPanel({ validCount, sending, progress, onSend }: SendPanelProps) {
  const [senderName, setSenderName] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSend({ senderName: senderName.trim(), subject: subject.trim(), content: content.trim() });
  };

  return (
    <Card delay={0.15}>
      <CardHeader
        eyebrow="Step 4"
        title="Send Emails"
        description="Compose your message below, then deliver it to every sendable recipient"
        icon={<Send className="h-5 w-5" aria-hidden="true" />}
      />

      <AnimatePresence mode="wait">
        {!sending ? (
          <motion.form
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="space-y-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="sender-name" label="Your name" icon={User}>
                <input
                  id="sender-name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Jane Doe"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className={FIELD_CLASS}
                />
              </Field>

              <Field id="email-subject" label="Subject" icon={Mail}>
                <input
                  id="email-subject"
                  type="text"
                  required
                  placeholder="Subject line"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={FIELD_CLASS}
                />
              </Field>
            </div>

            <Field id="email-content" label="Message" icon={MessageSquare}>
              <textarea
                id="email-content"
                required
                rows={8}
                placeholder="Write the email content here. Use {{name}} anywhere to personalize with each recipient's name."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`${FIELD_CLASS} resize-y`}
              />
            </Field>

            <p className="text-xs text-primary-400">
              Tip: use <code className="rounded bg-primary-50 px-1.5 py-0.5 font-mono text-[11px] text-secondary-600">{'{{name}}'}</code>{' '}
              in the subject or message to fill in each recipient&apos;s name from the uploaded file.
            </p>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <Button type="submit" variant="secondary" size="lg" disabled={validCount === 0}>
                <Send className="h-4 w-4" aria-hidden="true" />
                Send Emails ({validCount})
              </Button>
              {validCount === 0 && (
                <p className="text-sm text-primary-400">No valid emails available to send to.</p>
              )}
            </div>
          </motion.form>
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
