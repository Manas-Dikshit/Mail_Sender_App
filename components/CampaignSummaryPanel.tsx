'use client';

import type { CampaignSummary as CampaignSummaryType } from '@/types';

interface CampaignSummaryPanelProps {
  summary: CampaignSummaryType;
  campaignId: string;
}

const REPORT_TYPES: { type: 'excel' | 'csv' | 'html' | 'json' | 'log'; label: string }[] = [
  { type: 'excel', label: 'Excel (.xlsx)' },
  { type: 'csv', label: 'CSV' },
  { type: 'html', label: 'HTML Summary' },
  { type: 'json', label: 'JSON Summary' },
  { type: 'log', label: 'Workflow Log' },
];

export default function CampaignSummaryPanel({ summary, campaignId }: CampaignSummaryPanelProps) {
  const items = [
    { label: 'Total', value: summary.total, tone: 'text-gray-900' },
    { label: 'Sent', value: summary.sent, tone: 'text-green-600' },
    { label: 'Failed', value: summary.failed, tone: 'text-red-600' },
    { label: 'Skipped', value: summary.skipped, tone: 'text-yellow-600' },
  ];

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">5. Campaign Summary</h2>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-md border border-gray-100 bg-gray-50 p-4 text-center">
            <div className={`text-2xl font-semibold ${item.tone}`}>{item.value}</div>
            <div className="mt-1 text-xs text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {REPORT_TYPES.map((report) => (
          <a
            key={report.type}
            href={`/api/report?campaignId=${encodeURIComponent(campaignId)}&type=${report.type}`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Download {report.label}
          </a>
        ))}
      </div>
    </section>
  );
}
