import type { ReactNode } from 'react';
import { CheckCircle2, XCircle, Clock, HelpCircle, ShieldAlert, MailWarning } from 'lucide-react';
import { cn } from '@/components/lib/cn';

const TONE_STYLES = {
  success: 'bg-accent-100 text-accent-700 border-accent-200',
  info: 'bg-secondary-50 text-secondary-700 border-secondary-200',
  warning: 'bg-primary-50 text-primary-600 border-primary-200',
  critical: 'bg-primary-100 text-primary-800 border-primary-300',
  neutral: 'bg-canvas-muted text-primary-500 border-primary-100',
} as const;

export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: keyof typeof TONE_STYLES;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        TONE_STYLES[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Maps validation/send status strings to an icon + tone + readable label. */
const STATUS_MAP: Record<string, { tone: keyof typeof TONE_STYLES; icon: ReactNode; label?: string }> = {
  VALID: { tone: 'success', icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> },
  SENT: { tone: 'success', icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> },
  CATCH_ALL: { tone: 'info', icon: <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />, label: 'Catch-all' },
  INVALID_FORMAT: { tone: 'critical', icon: <XCircle className="h-3.5 w-3.5" aria-hidden="true" />, label: 'Invalid format' },
  INVALID_DOMAIN: { tone: 'critical', icon: <XCircle className="h-3.5 w-3.5" aria-hidden="true" />, label: 'Invalid domain' },
  INVALID_MAILBOX: { tone: 'critical', icon: <MailWarning className="h-3.5 w-3.5" aria-hidden="true" />, label: 'Invalid mailbox' },
  ACCESS_DENIED: { tone: 'warning', icon: <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />, label: 'Access denied' },
  TEMPORARY_FAILURE: { tone: 'warning', icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" />, label: 'Temporary failure' },
  FAILED: { tone: 'critical', icon: <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> },
  SKIPPED: { tone: 'warning', icon: <Clock className="h-3.5 w-3.5" aria-hidden="true" /> },
  UNKNOWN: { tone: 'neutral', icon: <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" /> },
};

export function StatusBadge({ status }: { status: string }) {
  const entry = STATUS_MAP[status] ?? { tone: 'neutral' as const, icon: <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" /> };
  const label = entry.label ?? status.replace(/_/g, ' ').toLowerCase();
  return (
    <Badge tone={entry.tone} icon={entry.icon}>
      <span className="capitalize">{label}</span>
    </Badge>
  );
}