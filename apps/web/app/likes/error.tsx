'use client';

import { ErrorView } from '@/components/error-view';

export default function LikesError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <ErrorView
      {...props}
      title="No pudimos cargar tus likes"
      description="Suele ser un problema temporal. Tu colección sigue guardada."
    />
  );
}
