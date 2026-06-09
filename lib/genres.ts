/**
 * Master Music Genre List
 * Curated list of ~70 genres organized by category
 * Based on Spotify's official genre taxonomy
 */

import type { GenreDto } from '@/types/phase1';

export type GenreCategory = {
  name: string;
  icon: string;
  genres: string[];
};

export const GENRE_CATEGORIES: GenreCategory[] = [
  {
    name: 'Rock & Alternative',
    icon: '🎸',
    genres: [
      'rock',
      'alternative rock',
      'indie rock',
      'punk rock',
      'hard rock',
      'progressive rock',
      'classic rock',
      'garage rock',
    ],
  },
  {
    name: 'Pop',
    icon: '🎤',
    genres: [
      'pop',
      'indie pop',
      'synth-pop',
      'electropop',
      'dance pop',
      'art pop',
      'dream pop',
      'power pop',
    ],
  },
  {
    name: 'Electronic & Dance',
    icon: '🎹',
    genres: [
      'electronic',
      'edm',
      'house',
      'techno',
      'trance',
      'dubstep',
      'drum and bass',
      'ambient',
    ],
  },
  {
    name: 'Hip-Hop & R&B',
    icon: '🎧',
    genres: [
      'hip hop',
      'rap',
      'r&b',
      'trap',
      'soul',
      'neo soul',
      'funk',
      'contemporary r&b',
    ],
  },
  {
    name: 'Metal & Heavy',
    icon: '🤘',
    genres: [
      'metal',
      'heavy metal',
      'death metal',
      'black metal',
      'metalcore',
      'nu metal',
      'thrash metal',
    ],
  },
  {
    name: 'Jazz & Blues',
    icon: '🎺',
    genres: [
      'jazz',
      'blues',
      'smooth jazz',
      'bebop',
      'swing',
      'acid jazz',
    ],
  },
  {
    name: 'Country & Folk',
    icon: '🪕',
    genres: [
      'country',
      'folk',
      'americana',
      'bluegrass',
      'singer-songwriter',
      'indie folk',
    ],
  },
  {
    name: 'Latin & World',
    icon: '🌎',
    genres: [
      'latin',
      'reggaeton',
      'salsa',
      'bossa nova',
      'reggae',
      'afrobeat',
      'k-pop',
    ],
  },
  {
    name: 'Classical & Soundtrack',
    icon: '🎻',
    genres: [
      'classical',
      'opera',
      'soundtrack',
      'film score',
      'orchestral',
    ],
  },
  {
    name: 'Other',
    icon: '🎵',
    genres: [
      'disco',
      'new wave',
      'grunge',
      'emo',
      'ska',
      'punk',
      'shoegaze',
      'post-punk',
    ],
  },
];

/**
 * Flattened list of all available genres
 */
export const ALL_GENRES: string[] = GENRE_CATEGORIES.flatMap((category) => category.genres);

/**
 * Search/filter genres by query string
 */
export function searchGenres(query: string): string[] {
  if (!query.trim()) return ALL_GENRES;

  const lowerQuery = query.toLowerCase();
  return ALL_GENRES.filter((genre) => genre.toLowerCase().includes(lowerQuery));
}

/**
 * Get category for a specific genre
 */
export function getCategoryForGenre(genre: string): string | null {
  const category = GENRE_CATEGORIES.find((cat) => cat.genres.includes(genre.toLowerCase()));
  return category ? category.name : null;
}

/**
 * Validate if a genre exists in the master list
 */
export function isValidGenre(genre: string): boolean {
  return ALL_GENRES.includes(genre.toLowerCase());
}

/**
 * Normalize genre string (lowercase, trim)
 */
export function normalizeGenre(genre: string): string {
  return genre.toLowerCase().trim();
}

/**
 * Title-case a genre slug for display (e.g. 'alternative rock' -> 'Alternative Rock').
 * Preserves stylized tokens like 'r&b', 'k-pop', and 'edm'.
 */
function toDisplayName(slug: string): string {
  const preserved: Record<string, string> = {
    'r&b': 'R&B',
    edm: 'EDM',
    'k-pop': 'K-Pop',
    'drum and bass': 'Drum and Bass',
  };
  if (preserved[slug]) return preserved[slug];
  return slug
    .split(' ')
    .map((word) =>
      word
        .split('-')
        .map((part) => (part.length === 0 ? part : part[0].toUpperCase() + part.slice(1)))
        .join('-')
    )
    .join(' ');
}

/**
 * Build the full list of genres as `GenreDto[]` for surfaces (e.g. the
 * "Add Genre" dialog in /preferences/edit) that previously hit a backend
 * catalog endpoint. Avoids a network call and works without auth gates.
 */
export const ALL_GENRE_DTOS: GenreDto[] = ALL_GENRES.map((slug) => ({
  id: slug,
  name: slug,
  displayName: toDisplayName(slug),
  isPrimary: true,
  parentGenre: null,
}));
