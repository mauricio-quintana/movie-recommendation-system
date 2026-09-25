'use client';

import { useState, useTransition } from 'react';
import { requestRecommendation } from '@/lib/actions';

export function RequestRecommendationButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function request() {
    setError(null);

    startTransition(async () => {
      // On success the action redirects to the recommendation status page.
      const result = await requestRecommendation();

      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={request} disabled={pending} className="button-primary">
        {pending ? 'Requesting…' : '✨ Get a recommendation'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
