'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePreferences } from '@/app/hooks/usePreferences';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Music, Edit, Sparkles, User } from 'lucide-react';

type Props = {
  showEditButton?: boolean;
  compact?: boolean;
  limit?: number;
  /**
   * Genre names from the exempt profile DTO (`musicPreferences.favoriteGenres`).
   * Used as a fallback when the gated `GET /preferences/genres` returns nothing —
   * notably for a FINISHED-but-unverified user, where that endpoint 403s. Lets us
   * show the user's saved genres (without weights/source) instead of an empty
   * "no preferences" state; the rich view returns once the email is verified.
   */
  fallbackGenres?: string[];
};

// "indie pop" → "Indie Pop" for display parity with the rich view's genreDisplayName.
const toTitleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export default function MusicPreferencesDisplay({
  showEditButton = true,
  compact = false,
  limit = 20,
  fallbackGenres,
}: Props) {
  const router = useRouter();
  const { preferences, loading, error, emailVerificationRequired, fetchPreferences } =
    usePreferences();

  useEffect(() => {
    fetchPreferences(limit);
  }, [fetchPreferences, limit]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Music Taste
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Music Taste
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (preferences.length === 0) {
    // Fallback: the gated /preferences/genres returned nothing (e.g. unverified email),
    // but the profile DTO has the saved genre names — show them so the section isn't
    // misleadingly empty. The rich weighted/source view returns once the endpoint is
    // reachable (after email verification).
    if (fallbackGenres && fallbackGenres.length > 0) {
      return (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Music Taste
              </CardTitle>
              {showEditButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/preferences/edit')}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {fallbackGenres.map((genre) => (
                <Badge key={genre} variant="secondary" className="text-sm">
                  {toTitleCase(genre)}
                </Badge>
              ))}
            </div>
            {emailVerificationRequired && (
              <p className="text-xs text-muted-foreground">
                Verify your email to unlock your full music breakdown — rankings, weights, and Spotify matches.
              </p>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Music Taste
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-muted p-4">
              <Music className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">No music preferences yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your music taste to find better matches
              </p>
              <Button onClick={() => router.push('/onboarding')}>
                Add Music Preferences
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topGenres = preferences.slice(0, 5);
  const otherGenres = preferences.slice(5, limit);
  const hasSpotifySource = preferences.some((p) => p.source === 'spotify_derived');
  const hasManualSource = preferences.some((p) => p.source === 'manual_selection');

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Music className="h-4 w-4" />
              Music Taste
            </CardTitle>
            {showEditButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/preferences/edit')}
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {topGenres.map((pref) => (
              <Badge key={pref.genreName} variant="secondary">
                {pref.genreDisplayName}
              </Badge>
            ))}
            {otherGenres.length > 0 && (
              <Badge variant="outline">+{otherGenres.length} more</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Music Taste
          </CardTitle>
          {showEditButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/preferences/edit')}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top 5 Genres with Rankings */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Top Genres
          </h3>
          <div className="space-y-2">
            {topGenres.map((pref, index) => (
              <div
                key={pref.genreName}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    #{index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {pref.genreDisplayName}
                    </span>
                    {pref.source === 'spotify_derived' && (
                      <Sparkles className="h-3 w-3 text-green-600 flex-shrink-0" aria-label="From Spotify" />
                    )}
                    {pref.source === 'manual_selection' && (
                      <User className="h-3 w-3 text-blue-600 flex-shrink-0" aria-label="Manually selected" />
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className="text-sm font-bold text-green-600">
                    {Math.round(pref.weight * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Other Genres */}
        {otherGenres.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Also Enjoys
              </h3>
              <div className="flex flex-wrap gap-2">
                {otherGenres.map((pref) => (
                  <Badge
                    key={pref.genreName}
                    variant="secondary"
                    className="text-sm"
                  >
                    {pref.genreDisplayName}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Source Indicator */}
        <Separator />
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          {hasSpotifySource && hasManualSource && (
            <>
              <Sparkles className="h-3 w-3 text-green-600" />
              <span>Spotify</span>
              <span>+</span>
              <User className="h-3 w-3 text-blue-600" />
              <span>Manual</span>
            </>
          )}
          {hasSpotifySource && !hasManualSource && (
            <>
              <Sparkles className="h-3 w-3 text-green-600" />
              <span>From Spotify listening history</span>
            </>
          )}
          {!hasSpotifySource && hasManualSource && (
            <>
              <User className="h-3 w-3 text-blue-600" />
              <span>Manually selected</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
