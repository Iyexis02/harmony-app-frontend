import { authOptions } from './app/api/auth/[...nextauth]/route';
import { SpotifyUserProfile, UserTopArtists, UserTopTracks } from './types';
import { getServerSession } from 'next-auth';
import type { ApiResult } from '@/types/auth';

/**
 * Result discriminated union:
 * - ok: true  -> profile is present
 * - ok: false -> error contains status/message
 */
export type SpotifyProfileResult =
  | { ok: true; profile: SpotifyUserProfile }
  | { ok: false; error: { status: number; message: string } };

export async function getUserProfile(): Promise<SpotifyProfileResult> {
  // get server session (may be undefined)
  const session = await getServerSession(authOptions);
  const token = session?.spotifyAccessToken;

  if (!token) {
    return {
      ok: false,
      error: { status: 401, message: 'No Spotify access token in session' },
    };
  }

  try {
    const profileRequest = await fetch(`${process.env.SPOTIFY_API_BASE_URL}/me`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
      },
    });

    // Try to parse body as JSON (Spotify returns JSON for both success & errors)
    const body = await profileRequest.json().catch(() => null);

    if (profileRequest.ok && body) {
      // Success — assume body matches SpotifyUserProfile
      return { ok: true, profile: body as SpotifyUserProfile };
    }

    // Non-2xx response — Spotify returns an object like { error: { status, message } }
    if (body && typeof body === 'object' && 'error' in body) {
      const err = (body as any).error;
      const status = typeof err.status === 'number' ? err.status : profileRequest.status;
      const message = err.message ?? JSON.stringify(body);
      return { ok: false, error: { status, message } };
    }

    // Fallback for unexpected responses
    return {
      ok: false,
      error: {
        status: profileRequest.status,
        message: body ? JSON.stringify(body) : profileRequest.statusText || 'Unknown error',
      },
    };
  } catch (e: any) {
    // Network or parsing error
    console.error('getUserProfile fetch error:', e);
    return {
      ok: false,
      error: { status: 500, message: e?.message ?? 'Network or parse error' },
    };
  }
}

export async function getMostListened(type: 'tracks' | 'artists'): Promise<ApiResult<UserTopTracks | UserTopArtists>> {
  const session = await getServerSession(authOptions);
  const token = session?.spotifyAccessToken;

  if (!token) {
    return {
      ok: false,
      error: { status: 401, message: 'No Spotify access token in session' },
    };
  }

  try {
    const url = `${process.env.SPOTIFY_API_BASE_URL}/me/top/${type}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
      },
    });

    const body = await resp.json().catch(() => null);

    if (resp.ok && body) {
      // body is either UserTopTracks or UserTopArtists depending on `type`
      return { ok: true, data: body as UserTopTracks | UserTopArtists };
    }

    if (body && typeof body === 'object' && 'error' in body) {
      const err = (body as any).error;
      const status = typeof err.status === 'number' ? err.status : resp.status;
      const message = err.message ?? JSON.stringify(body);
      return { ok: false, error: { status, message } };
    }

    return {
      ok: false,
      error: {
        status: resp.status,
        message: body ? JSON.stringify(body) : resp.statusText || 'Unknown error',
      },
    };
  } catch (e: any) {
    console.error('getMostListened fetch error:', e);
    return { ok: false, error: { status: 500, message: e?.message ?? 'Network or parse error' } };
  }
}
