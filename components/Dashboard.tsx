'use client';

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CampaignSummary, SendProgressEvent, ValidationOutcome } from '@/types';
import { useToast } from '@/components/Toast';
import { WorkflowTimeline } from '@/components/WorkflowTimeline';
import UploadPanel from '@/components/UploadPanel';
import ValidationSummary from '@/components/ValidationSummary';
import InvalidEmailsTable from '@/components/InvalidEmailsTable';
import SendPanel from '@/components/SendPanel';
import CampaignSummaryPanel from '@/components/CampaignSummaryPanel';

export default function Dashboard() {
  const { showToast } = useToast();

  const [uploading, setUploading] = useState(false);
  const [outcome, setOutcome] = useState<ValidationOutcome | null>(null);

  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<SendProgressEvent | null>(null);
  const [campaignSummary, setCampaignSummary] = useState<CampaignSummary | null>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setOutcome(null);
      setCampaignSummary(null);
      setProgress(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) {
          showToast(data.error ?? 'Upload failed.', 'error');
          return;
        }

        setOutcome(data as ValidationOutcome);
        showToast('File validated successfully.', 'success');
      } catch {
        showToast('Could not reach the server. Please try again.', 'error');
      } finally {
        setUploading(false);
      }
    },
    [showToast]
  );

  const handleSend = useCallback(
    async (senderName: string, htmlContent: string) => {
      if (!outcome) return;

      setSending(true);
      setCampaignSummary(null);
      setProgress({
        type: 'progress',
        processed: 0,
        remaining: outcome.summary.valid,
        total: outcome.summary.valid,
        percentage: 0,
        status: 'Starting\u2026',
      });

      try {
        const res = await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: outcome.campaignId,
            senderName,
            htmlContent,
          }),
        });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error ?? 'Sending failed to start.', 'error');
        setSending(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as SendProgressEvent;

          if (event.type === 'progress') {
            setProgress(event);
          } else if (event.type === 'complete') {
            setProgress(event);
            if (event.summary) setCampaignSummary(event.summary);
            showToast('Campaign complete.', 'success');
          } else if (event.type === 'error') {
            showToast(event.message ?? 'Sending failed.', 'error');
          }
        }
      }
    } catch {
      showToast('Connection lost while sending. Check the report for partial results.', 'error');
    } finally {
      setSending(false);
    }
  }, [outcome, showToast]);

  const activeStep = useMemo(() => {
    if (campaignSummary) return 5;
    if (sending) return 3;
    if (outcome) return 2;
    return 0;
  }, [outcome, sending, campaignSummary]);

  return (
    <div className="space-y-6">
      <WorkflowTimeline activeStep={activeStep} />

      <UploadPanel onUpload={handleUpload} uploading={uploading} />

      <AnimatePresence>
        {outcome && (
          <motion.div
            key="validation-stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <ValidationSummary summary={outcome.summary} />
            <InvalidEmailsTable rows={outcome.invalidRows} />
            <SendPanel
              campaignId={outcome.campaignId}
              validCount={outcome.summary.valid}
              invalidCount={outcome.summary.invalid + outcome.summary.uncertain}
              sending={sending}
              progress={progress}
              onSend={handleSend}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {campaignSummary && outcome && (
          <motion.div key="summary-stage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CampaignSummaryPanel summary={campaignSummary} campaignId={outcome.campaignId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}