'use client';

import { ErrorView } from '@/components/error-view';

export default function RecommendationsError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorView {...props} title="Recommendations could not be loaded" />;
}
