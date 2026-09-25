'use client';

import { useTransition } from 'react';
import { requestRecommendation } from '@/lib/actions';
import { useToast } from './toast';

interface RequestRecommendationButtonProps {
  label?: string;
  className?: string;
}

/**
 * Requests a recommendation (Server Action). On success the action navigates to it.
 */
export function RequestRecommendationButton({
  label = 'Pedir recomendación',
  className = 'btn-primary',
}: RequestRecommendationButtonProps) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function request() {
    startTransition(async () => {
      const result = await requestRecommendation();

      if (!result.ok) {
        toast(result.error);
      }
    });
  }

  return (
    <button type="button" onClick={request} disabled={pending} className={className}>
      {pending ? 'Pidiendo…' : label}
    </button>
  );
}
