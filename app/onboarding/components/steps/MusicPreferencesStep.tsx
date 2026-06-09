'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { MusicPreferencesRequestDto } from '@/types/onboarding';
import { ConcertFrequency, MusicImportance } from '@/app/enums/user/userEnum';
import { saveMusicPreferences, fetchRecommendedGenres } from '@/app/serverActions/onboarding';
import { GENRE_CATEGORIES, searchGenres } from '@/lib/genres';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, Sparkles, ChevronDown, ChevronUp, Loader2, Headphones } from 'lucide-react';
import { formatEnumValue } from '@/lib/profileHelpers';
import SectionHeader from '../SectionHeader';

const schema = z.object({
  favoriteGenres: z.array(z.string()).min(1, 'Select at least 1 genre'),
  concertFrequency: z.nativeEnum(ConcertFrequency),
  musicImportance: z.nativeEnum(MusicImportance),
  favoriteDecades: z.array(z.string()).optional(),
  openToNewGenres: z.boolean(),
  listeningTimes: z.array(z.string()).optional(),
  hoursPerDay: z.number().min(0).max(24).optional(),
});

type Props = {
  data?: MusicPreferencesRequestDto;
  onNext: (data: MusicPreferencesRequestDto) => void;
  onBack: () => void;
};

const DECADES = ['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];
const LISTENING_TIMES = ['Morning', 'Commute', 'Work', 'Evening', 'Night', 'Workout'];

export default function MusicPreferencesStep({ data, onNext, onBack }: Props) {
  const { data: session } = useSession();
  // Recommendations are derived from the user's Spotify top artists via the email-
  // verification-gated /api/v1/user/genres endpoint. For an unverified user that call is a
  // guaranteed 403 (logged as noise) with no payoff, so only attempt it once verified.
  const emailVerified = (session as { emailVerified?: boolean } | null)?.emailVerified === true;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [recommendedGenres, setRecommendedGenres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const form = useForm<MusicPreferencesRequestDto>({
    resolver: zodResolver(schema),
    defaultValues: data || {
      favoriteGenres: [],
      concertFrequency: ConcertFrequency.FEW_TIMES_A_YEAR,
      musicImportance: MusicImportance.IMPORTANT,
      favoriteDecades: [],
      openToNewGenres: true,
      listeningTimes: [],
      hoursPerDay: 3,
    },
  });

  const selectedGenres = form.watch('favoriteGenres');

  useEffect(() => {
    if (emailVerified && !data && !loadingRecommended && recommendedGenres.length === 0) {
      loadRecommendedGenres();
    }
  }, [data, emailVerified]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRecommendedGenres = async () => {
    setLoadingRecommended(true);
    const result = await fetchRecommendedGenres(50, 'medium_term');
    if (result.ok && result.data.length > 0) {
      setRecommendedGenres(result.data.slice(0, 5));
    }
    setLoadingRecommended(false);
  };

  const filteredGenres = useMemo(() => {
    if (!searchQuery.trim()) return GENRE_CATEGORIES;
    const matchingGenres = searchGenres(searchQuery);
    return GENRE_CATEGORIES.map((category) => ({
      ...category,
      genres: category.genres.filter((genre) => matchingGenres.includes(genre)),
    })).filter((category) => category.genres.length > 0);
  }, [searchQuery]);

  const toggleGenre = (genre: string) => {
    const current = form.getValues('favoriteGenres');
    form.setValue(
      'favoriteGenres',
      current.includes(genre) ? current.filter((g) => g !== genre) : [...current, genre]
    );
  };

  const toggleDecade = (decade: string) => {
    const current = form.getValues('favoriteDecades') || [];
    form.setValue(
      'favoriteDecades',
      current.includes(decade) ? current.filter((d) => d !== decade) : [...current, decade]
    );
  };

  const toggleListeningTime = (time: string) => {
    const current = form.getValues('listeningTimes') || [];
    form.setValue(
      'listeningTimes',
      current.includes(time) ? current.filter((t) => t !== time) : [...current, time]
    );
  };

  const onSubmit = async (formData: MusicPreferencesRequestDto) => {
    setIsLoading(true);
    setError(null);
    // The backend persists the weighted genre records server-side from `favoriteGenres`
    // inside this save — no separate per-genre calls, so no partial-failure path here.
    const result = await saveMusicPreferences(formData);
    if (result.ok) {
      onNext(formData);
    } else {
      setError(result.error.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-8">
      <SectionHeader
        icon={Headphones}
        roman="IV"
        eyebrow="act four · the soundtrack"
        title="Through it all,"
        accent="what plays?"
        description="The act this whole app turns on. The more truthful you are, the closer the harmony."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Genre Selection */}
          <FormField
            control={form.control}
            name="favoriteGenres"
            render={() => (
              <FormItem>
                <FormLabel>Favorite Genres <span className="text-destructive">*</span></FormLabel>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search genres..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {!searchQuery && (
                  <>
                    {loadingRecommended && (
                      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading personalized recommendations...
                      </div>
                    )}

                    {!loadingRecommended && recommendedGenres.length > 0 && (
                      <div className="mb-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Recommended for you</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recommendedGenres.map((genre) => (
                            <Badge
                              key={genre}
                              variant={selectedGenres.includes(genre) ? 'default' : 'secondary'}
                              className="cursor-pointer transition-all hover:scale-105"
                              onClick={() => toggleGenre(genre)}
                            >
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {!loadingRecommended && recommendedGenres.length === 0 && selectedGenres.length === 0 && (
                      <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
                        <p className="text-sm font-medium">Pick genres that define your taste</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Select from the categories below — the more you pick, the better your matches will be.
                          You can also connect Spotify later in Settings for automatic recommendations.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {selectedGenres.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-2 text-sm font-medium">Selected ({selectedGenres.length})</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedGenres.map((genre) => (
                        <Badge
                          key={genre}
                          variant="default"
                          className="cursor-pointer"
                          onClick={() => toggleGenre(genre)}
                        >
                          {genre} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator className="my-4" />

                {(() => {
                  const visibleCategories = searchQuery ? filteredGenres : (showAllGenres ? filteredGenres : filteredGenres.slice(0, 3));
                  const hasMore = !searchQuery && filteredGenres.length > 3;
                  return (
                    <>
                      <div className="space-y-4">
                        {visibleCategories.map((category) => (
                          <div key={category.name}>
                            <div className="mb-2 flex items-center gap-2">
                              <span className="text-lg">{category.icon}</span>
                              <span className="text-sm font-semibold">{category.name}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {category.genres.map((genre) => (
                                <Badge
                                  key={genre}
                                  variant={selectedGenres.includes(genre) ? 'default' : 'outline'}
                                  className="cursor-pointer transition-colors hover:bg-primary/20"
                                  onClick={() => toggleGenre(genre)}
                                >
                                  {genre}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {hasMore && (
                        <button
                          type="button"
                          onClick={() => setShowAllGenres((v) => !v)}
                          className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          {showAllGenres ? (
                            <><ChevronUp className="h-4 w-4" /> Show fewer genres</>
                          ) : (
                            <><ChevronDown className="h-4 w-4" /> Show all {filteredGenres.length} categories</>
                          )}
                        </button>
                      )}
                    </>
                  );
                })()}

                {filteredGenres.length === 0 && searchQuery && (
                  <p className="text-sm text-muted-foreground">
                    No genres found matching &quot;{searchQuery}&quot;
                  </p>
                )}

                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          {/* Concert Frequency */}
          <FormField
            control={form.control}
            name="concertFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>How often do you go to concerts? <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(ConcertFrequency).map((freq) => (
                      <Badge
                        key={freq}
                        variant={field.value === freq ? 'default' : 'outline'}
                        className="cursor-pointer px-4 py-2 text-sm"
                        onClick={() => field.onChange(freq)}
                      >
                        {formatEnumValue(freq)}
                      </Badge>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Music Importance */}
          <FormField
            control={form.control}
            name="musicImportance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>How important is music to you? <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(MusicImportance).map((importance) => (
                      <Badge
                        key={importance}
                        variant={field.value === importance ? 'default' : 'outline'}
                        className="cursor-pointer px-4 py-2 text-sm"
                        onClick={() => field.onChange(importance)}
                      >
                        {formatEnumValue(importance)}
                      </Badge>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Open to New Genres */}
          <FormField
            control={form.control}
            name="openToNewGenres"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>I&apos;m open to discovering new genres</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {/* Favorite Decades */}
          <FormField
            control={form.control}
            name="favoriteDecades"
            render={() => (
              <FormItem>
                <FormLabel>Favorite Decades <span className="text-muted-foreground text-xs font-normal">(optional)</span></FormLabel>
                <div className="flex flex-wrap gap-2">
                  {DECADES.map((decade) => (
                    <Badge
                      key={decade}
                      variant={form.watch('favoriteDecades')?.includes(decade) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleDecade(decade)}
                    >
                      {decade}
                    </Badge>
                  ))}
                </div>
              </FormItem>
            )}
          />

          {/* More Options toggle */}
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showMore ? 'Fewer options' : 'More options'}
          </button>

          {showMore && (
            <div className="space-y-6 pt-2">
              <FormField
                control={form.control}
                name="listeningTimes"
                render={() => (
                  <FormItem>
                    <FormLabel>When do you listen to music? <span className="text-muted-foreground text-xs font-normal">(optional)</span></FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {LISTENING_TIMES.map((time) => (
                        <Badge
                          key={time}
                          variant={form.watch('listeningTimes')?.includes(time) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleListeningTime(time)}
                        >
                          {time}
                        </Badge>
                      ))}
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hoursPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hours of music per day: {field.value || 0}h</FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={24}
                        step={1}
                        value={[field.value || 0]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                      />
                    </FormControl>
                    <FormDescription>Optional</FormDescription>
                  </FormItem>
                )}
              />
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onBack} className="rounded-full px-8">
              Back
            </Button>
            <Button type="submit" className="flex-1 rounded-full v-cta-gold" disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Continue'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
