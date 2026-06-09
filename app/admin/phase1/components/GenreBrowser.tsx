'use client';

import { useState, useEffect } from 'react';
import type { GenreDto } from '@/types/phase1';
import { useDebounce } from '@/app/hooks/useDebounce';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function GenreBrowser() {
  const [genres, setGenres] = useState<GenreDto[]>([]);
  const [search, setSearch] = useState('');
  const [primaryOnly, setPrimaryOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    fetchGenres();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, primaryOnly]);

  const fetchGenres = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (primaryOnly) params.append('primaryOnly', 'true');
      if (debouncedSearch) params.append('search', debouncedSearch);

      const response = await fetch(
        `${API_BASE_URL}/api/test/phase1/genres?${params}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setGenres(data.genres || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch genres');
      console.error('Failed to fetch genres:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          Genre Database
        </h1>
        <p className="text-gray-600 text-lg">
          Browse and search through the canonical genre collection
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Search Genres
            </label>
            <div className="relative">
              <input
                id="search"
                type="text"
                placeholder="Search by name (e.g., rock, jazz, indie)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              <svg
                className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={primaryOnly}
                onChange={(e) => setPrimaryOnly(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-700 select-none">
                Primary genres only
              </span>
            </label>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Found <span className="font-semibold text-purple-600">{genres.length}</span> genre
            {genres.length !== 1 ? 's' : ''}
          </p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* Genre List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading genres...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          <h3 className="font-semibold mb-2">Error Loading Genres</h3>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchGenres}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      ) : genres.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-6 py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 21a9 9 0 100-18 9 9 0 000 18z"
            />
          </svg>
          <p className="text-gray-600 text-lg font-medium">No genres found</p>
          <p className="text-gray-500 text-sm mt-2">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {genres.map((genre) => (
            <GenreCard key={genre.id} genre={genre} />
          ))}
        </div>
      )}
    </div>
  );
}

function GenreCard({ genre }: { genre: GenreDto }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">{genre.displayName}</h3>
        {genre.isPrimary && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Primary
          </span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-3">
        <DetailRow label="Name" value={genre.name} mono />

        {genre.parentGenre && (
          <DetailRow
            label="Parent"
            value={genre.parentGenre}
            badge
          />
        )}

        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            ID: <span className="font-mono">{genre.id}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
  badge = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      {badge ? (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
          {value}
        </span>
      ) : (
        <p
          className={`text-sm text-gray-900 ${mono ? 'font-mono bg-gray-50 px-2 py-1 rounded' : 'font-medium'}`}
        >
          {value}
        </p>
      )}
    </div>
  );
}
