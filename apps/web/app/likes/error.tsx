'use client';

import { ErrorView } from '@/components/error-view';

export default function LikesError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorView {...props} title="Your likes could not be loaded" />;
}
