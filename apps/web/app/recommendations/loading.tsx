import { PageSkeleton } from '@/components/states';

export default function Loading() {
  return (
    <PageSkeleton count={5}>
      <div className="flex flex-col gap-2">
        <div className="skeleton h-7 w-56 rounded" />
        <div className="skeleton h-3 w-96 max-w-full rounded" />
      </div>
    </PageSkeleton>
  );
}
