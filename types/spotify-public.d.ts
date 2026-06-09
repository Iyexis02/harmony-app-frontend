// Spotify Public API Types (Client Credentials Flow)
// These endpoints do NOT require user authentication

export type SpotifyImage = {
  url: string;
  height: number;
  width: number;
};

export type SpotifyArtist = {
  id: string;
  name: string;
  genres: string[];
  images: SpotifyImage[];
  popularity: number;
  href?: string;
  uri?: string;
  type?: string;
};

export type SpotifySimplifiedArtist = {
  id: string;
  name: string;
  href?: string;
  uri?: string;
};

export type SpotifyAlbum = {
  name: string;
  release_date: string;
  images?: SpotifyImage[];
  id?: string;
};

export type SpotifyTrack = {
  id: string;
  name: string;
  artists: SpotifySimplifiedArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  popularity: number;
  href?: string;
  uri?: string;
  preview_url?: string | null;
};

// Flat page shape returned from the backend's artist/track search endpoints.
// The raw backend response is { artists: ArtistSearchResult } / { tracks: TrackSearchResult };
// the lib/spotify-public-api helpers unwrap those before returning.
export type ArtistSearchResult = {
  items: SpotifyArtist[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
};

export type TrackSearchResult = {
  items: SpotifyTrack[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
};

export type GenreSeedsResponse = string[];

// Helper types for frontend use
export type SelectedArtist = {
  id: string;
  name: string;
  imageUrl?: string;
  genres: string[];
};

export type SelectedTrack = {
  id: string;
  name: string;
  artistNames: string[];
};
