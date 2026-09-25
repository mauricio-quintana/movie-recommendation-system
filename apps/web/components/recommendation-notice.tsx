'use client';

import { useEffect, useRef } from 'react';
import { isActiveStatus } from '@/lib/format';
import type { RecommendationStatus } from '@/lib/types';
import { useToast } from './toast';

/**
 * Toasts when the recommendation being watched finishes (the page refreshes while it runs).
 */
export function RecommendationNotice({
  id,
  status,
  title,
}: {
  id: string;
  status: RecommendationStatus;
  title: string | null;
}) {
  const toast = useToast();
  const previous = useRef<{ id: string; status: RecommendationStatus }>({ id, status });

  useEffect(() => {
    const before = previous.current;
    previous.current = { id, status };

    if (before.id !== id || !isActiveStatus(before.status)) {
      return;
    }

    if (status === 'COMPLETED') {
      toast(`Tu recomendación está lista${title ? `: ${title}` : ''}`);
    } else if (status === 'FAILED') {
      toast('No pudimos generar tu recomendación');
    }
  }, [id, status, title, toast]);

  return null;
}
