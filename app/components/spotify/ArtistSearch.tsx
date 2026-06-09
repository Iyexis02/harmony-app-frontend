'use client';

import { useState, useEffect } from 'react';
import { Search, Music, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/app/hooks/useDebounce';
import { searchArtists, getBestImageUrl } from '@/lib/spotify-public-api';
import type { SpotifyArtist, SelectedArtist } from '@/types/spotify-public';

type Props = {
  selectedArtists: SelectedArtist[];
  onArtistsChange: (artists: SelectedArtist[]) => void;
  maxSelection?: number;
  placeholder?: string;
};

export default function ArtistSearch({
  selectedArtists,
  onArtistsChange,
  maxSelection = 10,
  placeholder = 'Search for your favorite artists...',
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyArtist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await searchArtists(debouncedSearch, 10);
        setSearchResults(result.items);
      } catch (err) {
        setError('Failed to search artists. Please try again.');
        console.error('Artist search error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearch]);

  const handleSelectArtist = (artist: SpotifyArtist) => {
    // Check if artist is already selected
    if (selectedArtists.some((a) => a.id === artist.id)) {
      return;
    }

    // Check max selection limit
    if (selectedArtists.length >= maxSelection) {
      return;
    }

    const selectedArtist: SelectedArtist = {
      id: artist.id,
      name: artist.name,
      imageUrl: getBestImageUrl(artist.images, 'small'),
      genres: artist.genres || [],
    };

    onArtistsChange([...selectedArtists, selectedArtist]);
    setSearchQuery(''); // Clear search after selection
    setSearchResults([]);
  };

  const handleRemoveArtist = (artistId: string) => {
    onArtistsChange(selectedArtists.filter((a) => a.id !== artistId));
  };

  const showResults = searchQuery.trim() && (isLoading || searchResults.length > 0 || error);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 rounded-full border-border/50"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 animate-spin" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="bg-card border border-border rounded-2xl p-2 max-h-80 overflow-y-auto shadow-lg">
          {error && (
            <div className="px-4 py-3 text-destructive text-sm">
              {error}
            </div>
          )}

          {!error && !isLoading && searchResults.length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              No artists found. Try a different search term.
            </div>
          )}

          {!error && searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map((artist) => {
                const isSelected = selectedArtists.some((a) => a.id === artist.id);
                const isMaxed = selectedArtists.length >= maxSelection;

                return (
                  <button
                    key={artist.id}
                    onClick={() => handleSelectArtist(artist)}
                    disabled={isSelected || isMaxed}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      isSelected
                        ? 'bg-primary/10 cursor-default'
                        : isMaxed
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-muted cursor-pointer'
                    }`}
                  >
                    {/* Artist Image */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {artist.images && artist.images.length > 0 ? (
                        <img
                          src={getBestImageUrl(artist.images, 'small')}
                          alt={artist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Artist Info */}
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{artist.name}</p>
                      {artist.genres && artist.genres.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {artist.genres.slice(0, 3).join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Selected Indicator */}
                    {isSelected && (
                      <Badge variant="secondary" className="text-xs">
                        Selected
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Selected Artists */}
      {selectedArtists.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Selected Artists ({selectedArtists.length}/{maxSelection})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedArtists.map((artist) => (
              <Badge
                key={artist.id}
                className="pl-2 pr-1 py-1 flex items-center gap-2 rounded-full bg-secondary/20 hover:bg-secondary/30 text-foreground border border-secondary/30"
              >
                {artist.imageUrl && (
                  <img
                    src={artist.imageUrl}
                    alt={artist.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                )}
                <span className="text-sm">{artist.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full hover:bg-destructive/20"
                  onClick={() => handleRemoveArtist(artist.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
