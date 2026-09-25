import { EmptyState } from '@/components/states';

export default function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="The page you are looking for does not exist or you do not have access to it."
      action={{ href: '/movies', label: 'Browse movies' }}
    />
  );
}
