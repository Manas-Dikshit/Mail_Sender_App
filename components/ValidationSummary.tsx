import type { ValidationSummary as ValidationSummaryType } from '@/types';

export default function ValidationSummary({ summary }: { summary: ValidationSummaryType }) {
  const items = [
    { label: 'Total Emails', value: summary.total, tone: 'text-gray-900' },
    { label: 'Valid Emails', value: summary.valid, tone: 'text-green-600' },
    { label: 'Invalid Emails', value: summary.invalid, tone: 'text-red-600' },
  ];

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">2. Validation Summary</h2>
      <div className="mt-4 grid grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-md border border-gray-100 bg-gray-50 p-4 text-center">
            <div className={`text-2xl font-semibold ${item.tone}`}>{item.value}</div>
            <div className="mt-1 text-xs text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
