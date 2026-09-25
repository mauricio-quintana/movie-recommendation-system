'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, apiFetch } from './api';
import type { ActionResult } from './types';

function failure(
  error: unknown,
  messages: Partial<Record<number, string>>,
  fallback: string,
): ActionResult {
  if (error instanceof ApiError && error.status === 401) {
    redirect('/login');
  }

  const status = error instanceof ApiError ? error.status : 0;
  return { ok: false, error: messages[status] ?? fallback };
}

export async function setLike(tmdbId: number, liked: boolean): Promise<ActionResult> {
  if (!Number.isInteger(tmdbId) || tmdbId < 1) {
    return { ok: false, error: 'Película inválida' };
  }

  try {
    await apiFetch(`/likes/${tmdbId}`, { method: liked ? 'POST' : 'DELETE' });
  } catch (error) {
    return failure(
      error,
      { 404: 'No encontramos esa película', 503: 'El catálogo no responde. Probá en un momento.' },
      'No pudimos actualizar tu like',
    );
  }

  refresh();
  return { ok: true };
}

export async function requestRecommendation(): Promise<ActionResult> {
  let id: string;

  try {
    ({ id } = await apiFetch<{ id: string }>('/recommendations', { method: 'POST' }));
  } catch (error) {
    return failure(
      error,
      { 503: 'No pudimos preparar tu recomendación ahora. Probá en un momento.' },
      'No pudimos pedir la recomendación',
    );
  }

  redirect(`/recommendations?id=${id}`);
}
