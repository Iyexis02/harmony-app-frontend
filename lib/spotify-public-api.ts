import type { ArtistSearchResult, TrackSearchResult, GenreSeedsResponse, SpotifyArtist } from '@/types/spotify-public';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

/**
 * Search for artists by name/keyword (PUBLIC endpoint - no auth required)
 */
export async function searchArtists(
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<ArtistSearchResult> {
  if (!query.trim()) {
    return { items: [], limit, offset, total: 0, next: null, previous: null };
  }

  const url = `${API_BASE_URL}/spotify/search/artists?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to search artists: ${response.statusText}`);
  }

  // Backend response shape: { artists: { items, total, limit, offset, next, previous } }
  const data = await response.json();
  return data.artists as ArtistSearchResult;
}

/**
 * Search for tracks by name/artist/keyword (PUBLIC endpoint - no auth required)
 */
export async function searchTracks(
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<TrackSearchResult> {
  if (!query.trim()) {
    return { items: [], limit, offset, total: 0, next: null, previous: null };
  }

  const url = `${API_BASE_URL}/spotify/search/tracks?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to search tracks: ${response.statusText}`);
  }

  // Backend response shape: { tracks: { items, total, limit, offset, next, previous } }
  const data = await response.json();
  return data.tracks as TrackSearchResult;
}

/**
 * Get list of available genre seeds (PUBLIC endpoint - no auth required)
 * This list rarely changes, so consider caching the result
 */
export async function getGenres(): Promise<GenreSeedsResponse> {
  const url = `${API_BASE_URL}/spotify/genres`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch genres: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get detailed artist information by Spotify ID (PUBLIC endpoint - no auth required)
 */
export async function getArtistById(artistId: string): Promise<SpotifyArtist> {
  const url = `${API_BASE_URL}/spotify/artists/${artistId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch artist: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Helper function to get the best image URL from Spotify images array
 * Spotify provides images in multiple sizes (typically 640x640, 320x320, 160x160)
 */
export function getBestImageUrl(images: { url: string; height: number; width: number }[], preferredSize: 'large' | 'medium' | 'small' = 'medium'): string | undefined {
  if (!images || images.length === 0) return undefined;

  const sorted = [...images].sort((a, b) => b.height - a.height);

  if (preferredSize === 'large') {
    return sorted[0]?.url;
  } else if (preferredSize === 'small') {
    return sorted[sorted.length - 1]?.url;
  } else {
    // medium - try to get middle size
    return sorted[Math.floor(sorted.length / 2)]?.url || sorted[0]?.url;
  }
}

/**
 * Format duration from milliseconds to MM:SS
 */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
