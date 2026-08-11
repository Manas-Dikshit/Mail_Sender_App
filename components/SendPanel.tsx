'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Send,
  Loader2,
  User,
  Eye,
  FileText,
  AlertTriangle,
  AtSign,
  Mail,
} from 'lucide-react';
import type { PlaceholderMapping, SendProgressEvent, TemplateInfo } from '@/types';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatCounter } from '@/components/ui/stat-counter';

interface RecipientOption {
  rowId: number;
  email: string;
  name: string | null;
}

interface PreviewResult {
  rowId: number;
  email: string;
  subject: string;
  html: string;
  text: string;
}

interface PreviewResponse {
  template: Pick<TemplateInfo, 'filename' | 'title' | 'placeholders'>;
  mapping: PlaceholderMapping;
  recipients: RecipientOption[];
  preview: PreviewResult;
}

interface SendPanelProps {
  campaignId: string;
  validCount: number;
  invalidCount: number;
  sending: boolean;
  progress: SendProgressEvent | null;
  template: TemplateInfo | null;
  mapping: PlaceholderMapping | null;
  onSend: (senderName: string) => void;
}

const FIELD_CLASS =
  'block w-full rounded-xl2 border-2 border-primary-100 bg-white/80 px-3.5 py-2.5 text-sm text-primary-900 shadow-soft outline-none transition placeholder:text-primary-300 focus:border-secondary-400';

export default function SendPanel({
  campaignId,
  validCount,
  invalidCount,
  sending,
  progress,
  template,
  mapping,
  onSend,
}: SendPanelProps) {
  const [senderName, setSenderName] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<number | undefined>(undefined);

  const missing = mapping?.missing ?? [];
  const hasTemplate = Boolean(template && mapping);
  const canSend = validCount > 0 && hasTemplate && missing.length === 0 && !sending;

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!senderName.trim()) return;
    onSend(senderName.trim());
  };

  const runPreview = useCallback(
    async (rowId?: number) => {
      setPreviewing(true);
      try {
        const res = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId, rowId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setPreview(null);
          setPreviewing(false);
          return;
        }
        setSelectedRowId(data.preview.rowId);
        setPreview(data as PreviewResponse);
      } catch {
        setPreview(null);
      } finally {
        setPreviewing(false);
      }
    },
    [campaignId]
  );

  return (
    <Card delay={0.15}>
      <CardHeader
        eyebrow="Step 4"
        title={hasTemplate ? 'Send Email Campaign' : 'Send Emails'}
        description={
          hasTemplate
            ? 'Personalized template from template.html, delivered to every sendable recipient'
            : 'Compose your message below, then deliver it to every sendable recipient'
        }
        icon={<Send className="h-5 w-5" aria-hidden="true" />}
      />

      {hasTemplate && (
        <div className="mb-5 rounded-xl2 border border-primary-100 bg-white/70 p-4 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-900">
            <FileText className="h-4 w-4 text-secondary-500" aria-hidden="true" />
            Template: {template?.filename}
          </div>
          <div className="mt-2 grid gap-2 text-xs text-primary-600 sm:grid-cols-2">
            <div>
              <span className="font-semibold uppercase tracking-wide text-primary-400">Subject</span>
              <p className="mt-0.5 text-primary-800">{template?.title || '—'}</p>
            </div>
            <div>
              <span className="font-semibold uppercase tracking-wide text-primary-400">Placeholders</span>
              <p className="mt-0.5 font-mono text-[11px] text-primary-800">
                {mapping?.placeholders.length ? mapping.placeholders.join(', ') : '—'}
              </p>
            </div>
            <div>
              <span className="font-semibold uppercase tracking-wide text-primary-400">
                Mapped <span className="text-primary-800">{mapping?.mappedCount}/{mapping?.totalCount}</span>
              </span>
              <p className="mt-0.5 text-primary-800">
                {missing.length === 0
                  ? 'All placeholders resolved.'
                  : `${missing.length} unresolved: ${missing.join(', ')}`}
              </p>
            </div>
            <div>
              <span className="font-semibold uppercase tracking-wide text-primary-400">Recipients</span>
              <p className="mt-0.5 text-primary-800">
                {validCount} valid / {invalidCount} invalid
              </p>
            </div>
          </div>

          {missing.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl2 border border-accent-300 bg-accent-50 px-3 py-2.5 text-xs text-accent-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                These placeholders have no matching spreadsheet column, so emails cannot be sent until they are
                resolved: <span className="font-mono font-semibold">{missing.join(', ')}</span>. Add the matching
                column to the file or fix the placeholder in template.html.
              </span>
            </div>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {!sending ? (
          <motion.form
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSend}
            noValidate
            className="space-y-4"
          >
            <label htmlFor="sender-name" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary-500">
              <User className="h-3.5 w-3.5 text-secondary-500" aria-hidden="true" />
              Your name
            </label>
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

            {preview && (
              <div className="rounded-xl2 border border-secondary-100 bg-white/80 p-4 shadow-soft">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-primary-900">
                    <Eye className="h-4 w-4 text-secondary-600" aria-hidden="true" />
                    Preview
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-primary-500">
                    <AtSign className="h-3.5 w-3.5 text-secondary-500" aria-hidden="true" />
                    <span className="font-semibold uppercase tracking-wide">Recipient</span>
                    <select
                      value={preview.preview.rowId}
                      onChange={(e) => runPreview(Number(e.target.value))}
                      className="rounded-lg border border-primary-100 bg-white px-2 py-1 text-xs text-primary-800 outline-none focus:border-secondary-400"
                    >
                      {preview.recipients.map((r) => (
                        <option key={r.rowId} value={r.rowId}>
                          {r.email}
                          {r.name ? ` — ${r.name}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mb-2 text-xs text-primary-500">
                  <span className="font-semibold uppercase tracking-wide text-primary-400">To</span>{' '}
                  <span className="text-primary-800">{preview.preview.email}</span>
                </div>
                <div className="mb-3 text-sm">
                  <span className="font-semibold uppercase tracking-wide text-primary-400">Subject</span>{' '}
                  <span className="font-medium text-primary-900">{preview.preview.subject}</span>
                </div>

                <iframe
                  title={`Email preview for ${preview.preview.email}`}
                  srcDoc={preview.preview.html}
                  sandbox=""
                  className="h-80 w-full rounded-xl2 border border-primary-100 bg-white"
                />
              </div>
            )}

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => runPreview(selectedRowId)}
                  disabled={validCount === 0 || !hasTemplate}
                  loading={previewing}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  Preview Email
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  size="lg"
                  disabled={!canSend}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Send Emails ({validCount})
                </Button>
              </div>
              {!canSend && validCount > 0 && missing.length > 0 && (
                <p className="flex items-center gap-1 text-sm text-accent-700">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Resolve missing placeholders to send.
                </p>
              )}
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
