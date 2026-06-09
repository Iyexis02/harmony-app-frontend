'use server';

import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getMostListened } from '@/serverActions';
import { authenticatedApiRequest } from '@/lib/api';
import type { UserTopArtists, UserTopTracks } from '@/types';
import type { ApiResult } from '@/types/auth';
import type {
  BasicProfileRequestDto,
  CompleteProfileResponseDto,
  DatingPreferencesRequestDto,
  LifestyleRequestDto,
  LocationDto,
  MusicPreferencesRequestDto,
  OnboardingProgressDto,
  PersonalityRequestDto,
  PhotosRequestDto,
  PrivacySettingsRequestDto,
} from '@/types/onboarding';

async function makeOnboardingRequest<T>(path: string, method: 'GET' | 'PUT', body?: unknown): Promise<ApiResult<T>> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { ok: false, error: { status: 401, message: 'Not authenticated' } };
  }
  return authenticatedApiRequest<T>(path, session.accessToken, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

export async function saveBasicProfile(data: BasicProfileRequestDto) {
  return makeOnboardingRequest<void>('/api/v1/onboarding/basic-info', 'PUT', data);
}

export async function saveLocation(data: LocationDto) {
  return makeOnboardingRequest<void>('/api/v1/onboarding/location', 'PUT', data);
}

export async function savePhotos(data: PhotosRequestDto) {
  return makeOnboardingRequest<void>('/api/v1/onboarding/photos', 'PUT', data);
}

export async function saveMusicPreferences(data: MusicPreferencesRequestDto) {
  // The backend now persists the weighted genre-preference records server-side from
  // `favoriteGenres` inside this same PUT (see backend handoff:
  // BACKEND_TO_FRONTEND_email-verification-onboarding-fix.md, Problem A / Option 2).
  // The client previously fanned out a POST /api/v1/preferences/genres per genre — that
  // is now redundant, and those POSTs 403'd for unverified users (the standalone genres
  // endpoint stays email-verification-gated). A single PUT is sufficient and complete.
  return makeOnboardingRequest<void>('/api/v1/onboarding/music-preferences', 'PUT', data);
}

export async function saveLifestyle(data: LifestyleRequestDto) {
  return makeOnboardingRequest<void>('/api/v1/onboarding/lifestyle', 'PUT', data);
}

export async function savePersonality(data: PersonalityRequestDto) {
  return makeOnboardingRequest<void>('/api/v1/onboarding/personality', 'PUT', data);
}

export async function saveDatingPreferences(data: DatingPreferencesRequestDto) {
  return makeOnboardingRequest<void>('/api/v1/onboarding/dating-preferences', 'PUT', data);
}

export async function savePrivacySettings(data: PrivacySettingsRequestDto) {
  return makeOnboardingRequest<void>('/api/v1/onboarding/privacy-settings', 'PUT', data);
}

export async function getOnboardingProgress(): Promise<ApiResult<OnboardingProgressDto>> {
  const result = await getCompleteProfile();
  if (!result.ok) return result;
  return { ok: true, data: result.data.progress };
}

export async function getCompleteProfile() {
  return makeOnboardingRequest<CompleteProfileResponseDto>('/api/v1/onboarding/profile', 'GET');
}

// Prefill music preferences from Spotify
export async function getSpotifyMusicData(): Promise<ApiResult<Partial<MusicPreferencesRequestDto>>> {
  const [artistsResult, tracksResult] = await Promise.all([getMostListened('artists'), getMostListened('tracks')]);

  if (!artistsResult.ok || !tracksResult.ok) {
    return { ok: false, error: { status: 500, message: 'Failed to fetch Spotify data' } };
  }

  const artists = artistsResult.data as UserTopArtists;
  const tracks = tracksResult.data as UserTopTracks;

  // Extract genres from artists
  const genres = [...new Set(artists.items.flatMap((a) => a.genres))].slice(0, 10);

  return {
    ok: true,
    data: {
      favoriteGenres: genres,
      openToNewGenres: true,
    },
  };
}

/**
 * Fetch recommended genres from backend (extracted from user's Spotify top artists)
 * Uses the new /api/v1/user/genres endpoint
 *
 * @param limit - Number of top artists to analyze (default: 50, max: 50)
 * @param timeRange - Time range for analysis: 'short_term' | 'medium_term' | 'long_term'
 * @returns Array of unique, sorted genre strings
 */
export async function fetchRecommendedGenres(
  limit: number = 50,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'
): Promise<ApiResult<string[]>> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    time_range: timeRange,
  });

  return makeOnboardingRequest<string[]>(`/api/v1/user/genres?${params}`, 'GET');
}
