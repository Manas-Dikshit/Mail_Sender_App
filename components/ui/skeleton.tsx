import { cn } from '@/components/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-primary-100',
        className
      )}
      aria-hidden="true"
    />
  );
}