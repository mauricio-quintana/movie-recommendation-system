'use client';

import { useEffect } from 'react';

/**
 * Shared body for error.tsx boundaries. Server error details are never shown.
 */
export function ErrorView({
  error,
  retry,
  title = 'Something went wrong',
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="card flex flex-col items-center gap-3 p-10 text-center">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="text-muted max-w-md text-sm">
        The service may be temporarily unavailable. Please try again in a moment.
      </p>
      <button type="button" onClick={() => retry()} className="button-primary">
        Try again
      </button>
    </div>
  );
}
