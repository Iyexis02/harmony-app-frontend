import { RegistrationStage } from './app/enums/user/userEnum';

export type UserDto = {
  name: string | null;
  email: string | null;
  spotifyId: string | null;
  imageUrl: string | null;
};

export type SpotifyUserDto = {
  token: string;
  userId: string;
  name: string;
  email: string;
  registrationStage: string;
  emailVerified: boolean;
  authProvider: string;
};

export type SpotifyUserProfile = {
  country: string;
  display_name: string;
  email: string;
  explicit_content: {
    filter_enabled: boolean;
    filter_locked: boolean;
  };
  external_urls: {
    spotify: string;
  };
  followers: {
    href: string | null;
    total: number;
  };
  href: string;
  id: string;
  images: {
    height: number | null;
    url: string;
    width: number | null;
  }[];
  product: SubscriptionType;
  type: 'user';
  uri: string;
};

export type SubscriptionType = 'premium' | 'free' | 'open' | 'unknown';

export type UserTopTracks = {
  items: TrackItem[];
  total: number;
  limit: number;
  offset: number;
  href: string;
  next: string | null;
  previous: string | null;
};

export type TrackItem = {
  album: Album;
  artists: SimpleArtist[];
  available_markets: string[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_ids: ExternalIDs;
  external_urls: ExternalUrls;
  href: string;
  id: string;
  is_local: boolean;
  is_playable: boolean;
  name: string;
  popularity: number;
  preview_url: string | null;
  track_number: number;
  type: string;
  uri: string;
};

export type Album = {
  album_type: string;
  artists: SimpleArtist[]; // album-level artists
  available_markets: string[];
  external_urls: ExternalUrls;
  href: string;
  id: string;
  images: Image[];
  is_playable?: boolean; // sometimes present
  name: string;
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  type: string;
  uri: string;
};

export type SimpleArtist = {
  external_urls: ExternalUrls;
  href: string;
  id: string;
  name: string;
  type: string;
  uri: string;
};

export type Image = {
  height: number | null;
  url: string;
  width: number | null;
};

export type ExternalIDs = {
  // common id keys: isrc, ean, upc
  isrc?: string;
  ean?: string;
  upc?: string;
  [key: string]: string | undefined;
};

export type ExternalUrls = {
  spotify?: string;
  [key: string]: string | undefined;
};

export type UserTopArtists = {
  items: ArtistItem[];
  total: number;
  limit: number;
  offset: number;
  href: string;
  next: string | null;
  previous: string | null;
};

export type ArtistItem = {
  external_urls: ExternalUrls;
  followers: {
    href: string | null;
    total: number;
  };
  genres: string[];
  href: string;
  id: string;
  images: Image[];
  name: string;
  popularity: number;
  type: string;
  uri: string;
};

export type SpotifyProfileResult =
  | { ok: true; profile: SpotifyUserProfile }
  | { ok: false; error: { status: number; message: string } };
