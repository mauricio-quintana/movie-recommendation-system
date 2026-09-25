'use client';

import { ErrorView } from '@/components/error-view';

export default function MoviesError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorView {...props} title="The movie catalog is unavailable" />;
}
