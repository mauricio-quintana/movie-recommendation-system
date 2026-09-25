'use client';

import { ErrorView } from '@/components/error-view';

export default function RecommendationsError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <ErrorView
      {...props}
      title="No pudimos cargar tus recomendaciones"
      description="Suele ser un problema temporal. Tus likes y tus recomendaciones siguen guardados."
    />
  );
}
