import { cn } from '@/components/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-lg bg-gradient-to-r from-primary-50 via-canvas-muted to-primary-50 bg-[length:400px_100%]',
        className
      )}
      aria-hidden="true"
    />
  );
}