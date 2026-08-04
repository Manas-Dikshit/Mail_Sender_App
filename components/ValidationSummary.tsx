import { ListChecks, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import type { ValidationSummary as ValidationSummaryType } from '@/types';
import { Card, CardHeader } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';

export default function ValidationSummary({ summary }: { summary: ValidationSummaryType }) {
  return (
    <Card delay={0.05}>
      <CardHeader
        eyebrow="Step 2"
        title="Validation Summary"
        description="Results of the 4-stage email validation pipeline"
        icon={<ListChecks className="h-5 w-5" aria-hidden="true" />}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label="Total" value={summary.total} icon={<ListChecks className="h-4 w-4" aria-hidden="true" />} tone="primary" index={0} />
        <StatCard label="Sendable" value={summary.valid} icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />} tone="accent" index={1} />
        <StatCard label="Invalid" value={summary.invalid} icon={<XCircle className="h-4 w-4" aria-hidden="true" />} tone="critical" index={2} />
        <StatCard
          label="Uncertain"
          value={summary.uncertain}
          icon={<HelpCircle className="h-4 w-4" aria-hidden="true" />}
          tone="secondary"
          index={3}
        />
      </div>
    </Card>
  );
}