'use client';

import { ErrorView } from '@/components/error-view';

export default function DiscoverError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <ErrorView
      {...props}
      title="No pudimos cargar las películas"
      description="Suele ser un problema temporal. Tus likes están a salvo."
    />
  );
}
