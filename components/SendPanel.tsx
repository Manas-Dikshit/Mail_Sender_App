'use client';

import type { SendProgressEvent } from '@/types';

interface SendPanelProps {
  validCount: number;
  sending: boolean;
  progress: SendProgressEvent | null;
  onSend: () => void;
}

export default function SendPanel({ validCount, sending, progress, onSend }: SendPanelProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">4. Send Emails</h2>

      {!sending && (
        <div className="mt-4">
          <button
            onClick={onSend}
            disabled={validCount === 0}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send Emails ({validCount})
          </button>
          {validCount === 0 && (
            <p className="mt-2 text-sm text-gray-500">No valid emails available to send to.</p>
          )}
        </div>
      )}

      {sending && progress && (
        <div className="mt-4 space-y-3">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-sm text-gray-600">
            <span>Current: {progress.currentEmail ?? '—'}</span>
            <span>Processed: {progress.processed}</span>
            <span>Remaining: {progress.remaining}</span>
            <span>{progress.percentage}%</span>
          </div>
          <p className="text-sm text-gray-500">{progress.status}</p>
        </div>
      )}
    </section>
  );
}
