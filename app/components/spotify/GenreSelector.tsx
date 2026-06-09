'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getGenres } from '@/lib/spotify-public-api';

type Props = {
  selectedGenres: string[];
  onGenresChange: (genres: string[]) => void;
  maxSelection?: number;
};

export default function GenreSelector({
  selectedGenres,
  onGenresChange,
  maxSelection = 10,
}: Props) {
  const [genres, setGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGenres = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const genreList = await getGenres();
        setGenres(genreList);
      } catch (err) {
        setError('Failed to load genres. Please try again.');
        console.error('Genre fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGenres();
  }, []);

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      // Remove genre
      onGenresChange(selectedGenres.filter((g) => g !== genre));
    } else {
      // Add genre (if not at max)
      if (selectedGenres.length < maxSelection) {
        onGenresChange([...selectedGenres, genre]);
      }
    }
  };

  const formatGenreName = (genre: string): string => {
    // Convert kebab-case to Title Case
    return genre
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading genres...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium text-muted-foreground">
          Select your favorite genres ({selectedGenres.length}/{maxSelection})
        </p>
        {selectedGenres.length >= maxSelection && (
          <p className="text-xs text-muted-foreground italic">
            Maximum selection reached
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {genres.map((genre) => {
          const isSelected = selectedGenres.includes(genre);
          const isMaxed = selectedGenres.length >= maxSelection && !isSelected;

          return (
            <Badge
              key={genre}
              variant={isSelected ? 'default' : 'outline'}
              className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 ${
                isSelected
                  ? 'bg-secondary hover:bg-secondary text-secondary-foreground border-secondary'
                  : isMaxed
                  ? 'opacity-50 cursor-not-allowed'
                  : 'bg-background hover:bg-muted border-border/50'
              }`}
              onClick={() => !isMaxed && toggleGenre(genre)}
            >
              {formatGenreName(genre)}
            </Badge>
          );
        })}
      </div>

      {selectedGenres.length > 0 && (
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-2">Your selected genres:</p>
          <div className="flex flex-wrap gap-2">
            {selectedGenres.map((genre) => (
              <Badge
                key={genre}
                className="px-4 py-2 rounded-full bg-primary/10 hover:bg-primary/20 text-foreground border border-primary/20 cursor-pointer"
                onClick={() => toggleGenre(genre)}
              >
                {formatGenreName(genre)} ×
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
