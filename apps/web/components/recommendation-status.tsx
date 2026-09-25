import type { RecommendationStatus } from '@/lib/types';

const labels: Record<RecommendationStatus, { text: string; className: string }> = {
  PENDING: { text: 'Queued', className: 'border-amber-500 text-amber-600 dark:text-amber-400' },
  PROCESSING: { text: 'Processing', className: 'border-sky-500 text-sky-600 dark:text-sky-400' },
  COMPLETED: {
    text: 'Ready',
    className: 'border-emerald-500 text-emerald-600 dark:text-emerald-400',
  },
  FAILED: { text: 'Failed', className: 'border-red-500 text-red-600 dark:text-red-400' },
};

export function StatusBadge({ status }: { status: RecommendationStatus }) {
  const label = labels[status];

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${label.className}`}
    >
      {label.text}
    </span>
  );
}

export function isActive(status: RecommendationStatus): boolean {
  return status === 'PENDING' || status === 'PROCESSING';
}
