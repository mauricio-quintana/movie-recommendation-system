'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/**
 * false during server rendering and hydration, true afterwards. Lets browser-only
 * values (like the local time zone) render without hydration mismatches.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
