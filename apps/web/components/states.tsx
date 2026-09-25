import type { ReactNode } from 'react';

/**
 * Centered message with the design's dashed circle: empty and error states.
 */
export function StateMessage({
  title,
  description,
  icon,
  kicker,
  children,
  bordered = false,
}: {
  title: string;
  description?: string;
  icon?: string;
  kicker?: ReactNode;
  children?: ReactNode;
  bordered?: boolean;
}) {
  return (
    <section
      className={`flex flex-col items-center justify-center gap-2.5 px-5 text-center ${
        bordered ? 'dashed-panel min-h-[360px] py-12' : 'py-16'
      }`}
    >
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full border border-dashed border-dash-strong text-lg"
      >
        {icon}
      </span>
      {kicker && <span className="kicker">{kicker}</span>}
      <h2 className="m-0 text-xl font-bold">{title}</h2>
      {description && (
        <p className="m-0 max-w-[380px] text-sm leading-[1.45] text-muted">{description}</p>
      )}
      {children && <div className="mt-1.5 flex flex-wrap justify-center gap-2.5">{children}</div>}
    </section>
  );
}

function PosterSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="skeleton aspect-[2/3] rounded-[15px]" />
      <div className="skeleton h-2.5 w-4/5 rounded" />
      <div className="h-2 w-[45%] rounded bg-skeleton-soft" />
    </div>
  );
}

export function GridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="poster-grid">
      {Array.from({ length: count }, (_, index) => (
        <PosterSkeleton key={index} />
      ))}
    </div>
  );
}

/** Loading state: optional 440px hero followed by a poster grid. */
export function PageSkeleton({
  hero = true,
  count = 10,
  children,
}: {
  hero?: boolean;
  count?: number;
  children?: ReactNode;
}) {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-7">
      {children}
      {hero && <div className="skeleton h-[440px] rounded-2xl max-[520px]:h-[300px]" />}
      <GridSkeleton count={count} />
    </div>
  );
}
