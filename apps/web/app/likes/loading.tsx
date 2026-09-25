import { PageSkeleton } from '@/components/states';

export default function Loading() {
  return (
    <PageSkeleton hero={false}>
      <div className="skeleton h-[50px] rounded-[10px]" />
      <div className="flex items-center justify-between">
        <div className="skeleton h-2.5 w-[140px] rounded" />
        <div className="skeleton h-[34px] w-[230px] rounded-lg" />
      </div>
    </PageSkeleton>
  );
}
