'use client';

import { formatDateTime } from '@/lib/format';
import { useHydrated } from '@/lib/use-hydrated';

/**
 * Date and time in the browser's time zone ("24 sep 2026 · 18:04"). The server
 * does not know it, so until hydration the (UTC) text only reserves its space.
 */
export function LocalDateTime({
  value,
  uppercase = false,
}: {
  value: string;
  uppercase?: boolean;
}) {
  const hydrated = useHydrated();
  const text = formatDateTime(value, hydrated ? undefined : 'UTC');

  return (
    <time
      dateTime={value}
      aria-hidden={hydrated ? undefined : true}
      className={hydrated ? undefined : 'invisible'}
    >
      {uppercase ? text.toUpperCase() : text}
    </time>
  );
}
