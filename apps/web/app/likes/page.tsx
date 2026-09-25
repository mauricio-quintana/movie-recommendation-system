import type { Metadata } from 'next';
import { MovieCard, MovieGrid } from '@/components/movie-card';
import { RequestRecommendationButton } from '@/components/request-recommendation-button';
import { EmptyState } from '@/components/states';
import { apiFetchAuthenticated } from '@/lib/api';
import type { Like } from '@/lib/types';

export const metadata: Metadata = { title: 'My likes' };

export default async function LikesPage() {
  const likes = await apiFetchAuthenticated<Like[]>('/likes', '/likes');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My likes</h1>
          <p className="text-muted text-sm">
            {likes.length === 1 ? '1 movie' : `${likes.length} movies`} you liked. They are used to
            personalise your recommendations.
          </p>
        </div>
        {likes.length > 0 && <RequestRecommendationButton />}
      </div>

      {likes.length === 0 ? (
        <EmptyState
          title="You have not liked any movie yet"
          description="Like a few movies so we can recommend something you will enjoy."
          action={{ href: '/movies', label: 'Browse movies' }}
        />
      ) : (
        <MovieGrid>
          {likes.map((like) => (
            <MovieCard key={like.movie.tmdbId} movie={like.movie} liked />
          ))}
        </MovieGrid>
      )}
    </div>
  );
}
