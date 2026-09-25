import Link from 'next/link';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <h2 className="text-lg font-medium">{title}</h2>
      {description && <p className="text-muted max-w-md text-sm">{description}</p>}
      {action && (
        <Link href={action.href} className="button-primary">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function GridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card aspect-[2/3] animate-pulse bg-[var(--muted-surface)]" />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-4">
      <div className="h-8 w-1/3 animate-pulse rounded bg-[var(--muted-surface)]" />
      <div className="h-40 animate-pulse rounded bg-[var(--muted-surface)]" />
    </div>
  );
}
