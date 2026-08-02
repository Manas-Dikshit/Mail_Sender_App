'use client';

import { motion } from 'framer-motion';
import { PartyPopper, CheckCircle2, XCircle, Clock, FileSpreadsheet, FileText, FileJson, ScrollText, FileCode2 } from 'lucide-react';
import type { CampaignSummary as CampaignSummaryType } from '@/types';
import { Card, CardHeader } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';

interface CampaignSummaryPanelProps {
  summary: CampaignSummaryType;
  campaignId: string;
}

const REPORT_TYPES: { type: 'excel' | 'csv' | 'html' | 'json' | 'log'; label: string; icon: typeof FileSpreadsheet }[] = [
  { type: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { type: 'csv', label: 'CSV', icon: FileText },
  { type: 'html', label: 'HTML Summary', icon: FileCode2 },
  { type: 'json', label: 'JSON Summary', icon: FileJson },
  { type: 'log', label: 'Workflow Log', icon: ScrollText },
];

export default function CampaignSummaryPanel({ summary, campaignId }: CampaignSummaryPanelProps) {
  return (
    <Card delay={0.2} glow>
      <CardHeader
        eyebrow="Step 5"
        title="Campaign Summary"
        description="Download the full report in any format"
        icon={<PartyPopper className="h-5 w-5" aria-hidden="true" />}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={summary.total} icon={<PartyPopper className="h-4 w-4" aria-hidden="true" />} tone="primary" index={0} />
        <StatCard label="Sent" value={summary.sent} icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />} tone="accent" index={1} />
        <StatCard label="Failed" value={summary.failed} icon={<XCircle className="h-4 w-4" aria-hidden="true" />} tone="critical" index={2} />
        <StatCard label="Skipped" value={summary.skipped} icon={<Clock className="h-4 w-4" aria-hidden="true" />} tone="secondary" index={3} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {REPORT_TYPES.map(({ type, label, icon: Icon }, i) => (
          <motion.a
            key={type}
            href={`/api/report?campaignId=${encodeURIComponent(campaignId)}&type=${type}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            whileHover={{ y: -2 }}
            className="inline-flex items-center gap-2 rounded-xl2 border border-primary-200 bg-white/80 px-3.5 py-2 text-sm font-medium text-primary-700 shadow-soft transition-colors hover:border-secondary-300 hover:bg-secondary-50"
          >
            <Icon className="h-4 w-4 text-secondary-600" aria-hidden="true" />
            {label}
          </motion.a>
        ))}
      </div>
    </Card>
  );
}