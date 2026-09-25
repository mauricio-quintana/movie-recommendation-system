'use client';

import { useEffect } from 'react';
import { StateMessage } from './states';

/**
 * Shared body for error.tsx boundaries. Server error details are never shown.
 */
export function ErrorView({
  error,
  retry,
  title = 'Algo salió mal',
  description = 'Suele ser un problema temporal. Probá de nuevo en un momento.',
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
  description?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert">
      <StateMessage title={title} description={description}>
        <button type="button" onClick={() => retry()} className="btn-primary px-[18px] py-2.5">
          Reintentar
        </button>
      </StateMessage>
    </div>
  );
}
