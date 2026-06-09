// Phase 2: Genre Preferences Types

// Production API Types
export type GenrePreferenceDto = {
  genreName: string;
  genreDisplayName: string;
  weight: number;
  rank: number;
  confidence: number;
  source: 'spotify_derived' | 'manual_selection' | 'inferred' | 'hybrid' | 'seed_data';
  createdAt: string;
  updatedAt: string;
};

export type UserGenrePreferencesResponseDto = {
  total: number;
  preferences: GenrePreferenceDto[];
};

export type AddGenrePreferenceRequestDto = {
  genreName: string;
  weight: number;
};

export type AddGenrePreferenceResponseDto = {
  success: boolean;
  message: string;
  preference: GenrePreferenceDto;
};

export type RemoveGenrePreferenceResponseDto = {
  success: boolean;
  message: string;
};

export type SyncSpotifyResponseDto = {
  success: boolean;
  message: string;
  genreCount: number;
};

export type ClearSpotifyPreferencesResponseDto = {
  success: boolean;
  message: string;
};

// Test API Types
export type ExtractMockDataResponseDto = {
  userId: string;
  mockGenresCount: number;
  uniqueGenres: number;
  savedPreferences: number;
  preferences: Array<{
    genre: string;
    weight: number;
    confidence: number;
    rank: number;
    source: string;
  }>;
};

export type CalculateWeightResponseDto = {
  frequency: number;
  total: number;
  weight: number;
  confidence: number;
  percentage: string;
};

export type AddManualPreferenceTestResponseDto = {
  success: boolean;
  preference: {
    genre: string;
    weight: number;
    confidence: number;
    source: string;
  };
};

export type TopGenresResponseDto = {
  userId: string;
  totalPreferences: number;
  topGenres: Array<{
    rank: number;
    genre: string;
    weight: number;
    confidence: number;
    source: string;
  }>;
};

export type ClearPreferencesResponseDto = {
  success: boolean;
  message: string;
};

export type SyncSpotifyTestResponseDto = {
  success: boolean;
  userId: string;
  genreCount: number;
  top10Genres: string[];
};

// UI State Types
export type PreferenceSource = 'spotify' | 'manual' | 'hybrid';

export type MusicPreferencesOnboardingMethod = 'spotify' | 'manual' | null;
