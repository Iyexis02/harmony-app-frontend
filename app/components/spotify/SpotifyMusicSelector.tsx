'use client';

import { useState } from 'react';
import { Music2, ListMusic } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import ArtistSearch from './ArtistSearch';
import GenreSelector from './GenreSelector';
import type { SelectedArtist } from '@/types/spotify-public';

type Props = {
  selectedArtists: SelectedArtist[];
  onArtistsChange: (artists: SelectedArtist[]) => void;
  selectedGenres: string[];
  onGenresChange: (genres: string[]) => void;
  maxArtists?: number;
  maxGenres?: number;
  showTabs?: boolean;
};

/**
 * Combined component for selecting artists and genres
 * Can be used as tabbed interface or show both simultaneously
 */
export default function SpotifyMusicSelector({
  selectedArtists,
  onArtistsChange,
  selectedGenres,
  onGenresChange,
  maxArtists = 10,
  maxGenres = 10,
  showTabs = true,
}: Props) {
  const [activeTab, setActiveTab] = useState<'artists' | 'genres'>('genres');

  if (!showTabs) {
    // Show both artists and genres in a single view
    return (
      <div className="space-y-8">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ListMusic className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-semibold">Select Your Favorite Genres</h3>
          </div>
          <GenreSelector
            selectedGenres={selectedGenres}
            onGenresChange={onGenresChange}
            maxSelection={maxGenres}
          />
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Music2 className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-semibold">Search for Your Favorite Artists</h3>
          </div>
          <ArtistSearch
            selectedArtists={selectedArtists}
            onArtistsChange={onArtistsChange}
            maxSelection={maxArtists}
          />
        </Card>
      </div>
    );
  }

  // Show tabbed interface
  return (
    <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'artists' | 'genres')}>
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="genres" className="flex items-center gap-2">
          <ListMusic className="w-4 h-4" />
          Genres
          {selectedGenres.length > 0 && (
            <span className="ml-1 text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">
              {selectedGenres.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="artists" className="flex items-center gap-2">
          <Music2 className="w-4 h-4" />
          Artists
          {selectedArtists.length > 0 && (
            <span className="ml-1 text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">
              {selectedArtists.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="genres" className="space-y-4">
        <GenreSelector
          selectedGenres={selectedGenres}
          onGenresChange={onGenresChange}
          maxSelection={maxGenres}
        />
      </TabsContent>

      <TabsContent value="artists" className="space-y-4">
        <ArtistSearch
          selectedArtists={selectedArtists}
          onArtistsChange={onArtistsChange}
          maxSelection={maxArtists}
        />
      </TabsContent>
    </Tabs>
  );
}
