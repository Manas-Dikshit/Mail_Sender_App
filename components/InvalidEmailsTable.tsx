'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ValidationResult } from '@/types';
import { VALIDATION_STAGE_LABELS } from '@/types';
import { Card, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';

export default function InvalidEmailsTable({ rows }: { rows: ValidationResult[] }) {
  return (
    <Card delay={0.1}>
      <CardHeader
        eyebrow="Step 3"
        title="Needs Attention"
        description={rows.length > 0 ? `${rows.length} address${rows.length === 1 ? '' : 'es'} need attention` : undefined}
        icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
      />

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl2 bg-accent-50 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-accent-600" aria-hidden="true" />
          <p className="text-sm font-semibold text-accent-700">No addresses need attention.</p>
          <p className="text-xs text-accent-600">No non-sendable or uncertain addresses were found.</p>
        </div>
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden max-h-80 overflow-auto rounded-xl2 border border-primary-100 sm:block">
            <table className="min-w-full divide-y divide-primary-100 text-sm">
              <thead className="sticky top-0 z-10 bg-primary-50/95 backdrop-blur">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary-500">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-50">
                {rows.map((row, i) => (
                  <motion.tr
                    key={row.rowId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.4) }}
                    className="transition-colors hover:bg-secondary-50/60"
                  >
                    <td className="px-4 py-2.5 font-medium text-primary-800">{row.email}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-2.5 text-primary-500">{row.reason || VALIDATION_STAGE_LABELS[row.status]}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="flex max-h-96 flex-col gap-2.5 overflow-auto sm:hidden">
            {rows.map((row, i) => (
              <motion.div
                key={row.rowId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.4) }}
                className="rounded-xl2 border border-primary-100 bg-white/80 p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-primary-800">{row.email}</p>
                  <StatusBadge status={row.status} />
                </div>
                <p className="mt-1.5 text-xs text-primary-500">{row.reason || VALIDATION_STAGE_LABELS[row.status]}</p>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}