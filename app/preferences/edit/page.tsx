'use client';

import { ArrowLeft, Music, Plus, RefreshCw, Search, Sparkles, Trash2, User } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { usePreferences } from '@/app/hooks/usePreferences';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { ALL_GENRE_DTOS } from '@/lib/genres';
import type { GenreDto } from '@/types/phase1';

export default function EditPreferencesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const {
    preferences,
    loading,
    error,
    fetchPreferences,
    addPreference,
    removePreference,
    syncSpotify,
    clearSpotifyPreferences,
  } = usePreferences();

  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  // Genre catalog comes from the local curated list (lib/genres.ts) instead of
  // a backend test-namespace endpoint. The previous /api/test/phase1/genres
  // call was unauthenticated and gated in non-test environments, which made
  // the dialog show "All genres already added!" for real users.
  const [allGenres] = useState<GenreDto[]>(() => ALL_GENRE_DTOS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [weight, setWeight] = useState<number>(1.0);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);

  // Redirect only when definitively logged out — see matches/page.tsx. Avoids a spurious
  // /login bounce during the transient 'loading' phase where `session` is undefined.
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleSyncSpotify = async () => {
    setSyncing(true);
    setSyncResult(null);
    const result = await syncSpotify(false);
    setSyncing(false);
    if (result && typeof result !== 'boolean') {
      setSyncResult(`Synced ${result.genreCount} genres from Spotify!`);
      setTimeout(() => setSyncResult(null), 5000);
    }
  };

  const handleClearSpotify = async () => {
    setClearing(true);
    await clearSpotifyPreferences();
    setClearing(false);
    setClearConfirm(false);
  };

  const handleRemove = async (genreName: string) => {
    if (removing) return;
    setRemoving(true);
    await removePreference(genreName);
    setRemoving(false);
    setRemoveTarget(null);
  };

  const handleAddGenre = async () => {
    if (!selectedGenre) return;
    setAdding(true);
    const success = await addPreference(selectedGenre, weight);
    setAdding(false);
    if (success) {
      toast('Genre added!');
      setShowAddDialog(false);
      setSelectedGenre('');
      setWeight(1.0);
      setSearchQuery('');
    }
  };

  const filteredGenres = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return allGenres.filter(
      (genre) =>
        genre.displayName.toLowerCase().includes(query) ||
        genre.name.toLowerCase().includes(query)
    );
  }, [allGenres, searchQuery]);

  const availableGenres = useMemo(
    () => filteredGenres.filter((genre) => !preferences.some((p) => p.genreName === genre.name)),
    [filteredGenres, preferences]
  );

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">Edit Music Preferences</h1>
          <p className="text-muted-foreground">Manage your music taste to find better matches</p>
        </div>

        {/* Sync result banner */}
        {syncResult && (
          <div className="mb-4 bg-green-500/10 border border-green-500/20 text-green-700 px-4 py-3 rounded-lg text-sm">
            {syncResult}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <Button variant="default" className="w-full" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Genre
            </Button>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Genre Preference</DialogTitle>
                <DialogDescription>Select a genre and set how much you like it</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="genre-search">Search Genres</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="genre-search"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <Label>Select Genre</Label>
                  <div className="mt-2 max-h-60 overflow-y-auto border rounded-md p-2">
                    <div className="flex flex-wrap gap-2">
                      {availableGenres.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-2">
                          {searchQuery ? 'No genres found matching your search' : 'All genres already added!'}
                        </p>
                      ) : (
                        availableGenres.map((genre) => (
                          <Badge
                            key={genre.id}
                            variant={selectedGenre === genre.name ? 'default' : 'outline'}
                            className="cursor-pointer hover:bg-primary/20"
                            onClick={() => setSelectedGenre(genre.name)}>
                            {genre.displayName}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {selectedGenre && (
                  <div>
                    <Label>Preference Strength: {Math.round(weight * 100)}%</Label>
                    <Slider
                      value={[weight]}
                      onValueChange={(vals) => setWeight(vals[0])}
                      min={0.1}
                      max={1.0}
                      step={0.1}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Higher values indicate stronger preference</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleAddGenre} disabled={!selectedGenre || adding} className="flex-1">
                    {adding ? 'Adding...' : 'Add Genre'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={handleSyncSpotify} disabled={syncing} className="w-full">
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from Spotify'}
          </Button>

          <Button variant="outline" onClick={() => setClearConfirm(true)} disabled={clearing} className="w-full">
            <Trash2 className="h-4 w-4 mr-2" />
            {clearing ? 'Clearing...' : 'Clear Spotify'}
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Preferences List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Your Preferences ({preferences.length})
            </CardTitle>
            <CardDescription>
              {preferences.length === 0
                ? 'No preferences yet. Add some genres to get started!'
                : 'Click the trash icon to remove a genre from your preferences'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : preferences.length === 0 ? (
              <div className="text-center py-12">
                <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No music preferences yet</p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Genre
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {preferences.map((pref, index) => (
                  <div
                    key={pref.genreName}
                    className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">#{index + 1}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{pref.genreDisplayName}</span>
                        {pref.source === 'spotify_derived' && <Sparkles className="h-4 w-4 text-green-600 shrink-0" />}
                        {pref.source === 'manual_selection' && <User className="h-4 w-4 text-blue-600 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground" title="How strongly this genre influences your match score">Weight: {Math.round(pref.weight * 100)}%</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground" title="How certain we are about this preference based on your listening history">
                          Confidence: {Math.round(pref.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRemoveTarget(pref.genreName)}
                      className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <Sparkles className="h-4 w-4 inline text-green-600" /> <strong>Spotify Sync:</strong> Automatically
              extracts genres from your listening history
            </p>
            <p>
              <User className="h-4 w-4 inline text-blue-600" /> <strong>Manual Selection:</strong> Add genres you enjoy
              that might not be in your Spotify data
            </p>
            <p>
              <Music className="h-4 w-4 inline text-primary" /> <strong>Hybrid Approach:</strong> Combine Spotify sync
              with manual additions for best results
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Remove genre confirmation */}
      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removeTarget}?</DialogTitle>
            <DialogDescription>This genre will be removed from your preferences.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={removing} onClick={() => removeTarget && handleRemove(removeTarget)}>
              {removing ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Spotify confirmation */}
      <Dialog open={clearConfirm} onOpenChange={setClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Spotify preferences?</DialogTitle>
            <DialogDescription>
              All Spotify-derived genre preferences will be removed. Manual selections will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearSpotify} disabled={clearing}>
              {clearing ? 'Clearing...' : 'Clear Spotify'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
