'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, apiFetch } from './api';
import type { ActionResult } from './types';

function failure(error: unknown, fallback: string): ActionResult {
  if (error instanceof ApiError && error.status === 401) {
    redirect('/login');
  }

  return { ok: false, error: error instanceof ApiError ? error.message : fallback };
}

export async function setLike(tmdbId: number, liked: boolean): Promise<ActionResult> {
  if (!Number.isInteger(tmdbId) || tmdbId < 1) {
    return { ok: false, error: 'Invalid movie' };
  }

  try {
    await apiFetch(`/likes/${tmdbId}`, { method: liked ? 'POST' : 'DELETE' });
  } catch (error) {
    return failure(error, 'Could not update the like');
  }

  refresh();
  return { ok: true };
}

export async function requestRecommendation(): Promise<ActionResult> {
  let id: string;

  try {
    ({ id } = await apiFetch<{ id: string }>('/recommendations', { method: 'POST' }));
  } catch (error) {
    return failure(error, 'Could not request a recommendation');
  }

  redirect(`/recommendations/${id}`);
}
