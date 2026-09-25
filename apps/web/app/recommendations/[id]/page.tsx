import { redirect } from 'next/navigation';

// A recommendation is shown inside the Recomendaciones page; keep old links working.
export default async function RecommendationRedirect({
  params,
}: PageProps<'/recommendations/[id]'>) {
  const { id } = await params;
  redirect(`/recommendations?id=${encodeURIComponent(id)}`);
}
