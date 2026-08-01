import type { ValidationResult } from '@/types';
import { VALIDATION_STAGE_LABELS } from '@/types';

export default function InvalidEmailsTable({ rows }: { rows: ValidationResult[] }) {
  if (rows.length === 0) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">3. Invalid Emails</h2>
        <p className="mt-3 text-sm text-gray-500">No invalid emails found.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">3. Invalid Emails</h2>
      <div className="mt-4 max-h-72 overflow-auto rounded-md border border-gray-100">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Email</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.rowId}>
                <td className="px-3 py-2 text-gray-900">{row.email}</td>
                <td className="px-3 py-2 text-gray-500">
                  {row.reason || VALIDATION_STAGE_LABELS[row.status]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
