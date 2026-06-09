'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Loader2, Music, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ConcertFrequency, MusicImportance } from '@/app/enums/user/userEnum';
import { saveMusicPreferences } from '@/app/serverActions/onboarding';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { formatEnumValue } from '@/lib/profileHelpers';
import type { CompleteProfileResponseDto, MusicPreferencesRequestDto } from '@/types/onboarding';

const schema = z.object({
  favoriteGenres: z.array(z.string()).min(1, 'Select at least one genre'),
  concertFrequency: z.nativeEnum(ConcertFrequency),
  musicImportance: z.nativeEnum(MusicImportance),
  favoriteDecades: z.array(z.string()).optional(),
  openToNewGenres: z.boolean(),
  listeningTimes: z.array(z.string()).optional(),
  hoursPerDay: z.number().min(0).max(24).optional(),
});

const LISTENING_TIMES = ['Morning', 'Commute', 'Work', 'Evening', 'Night', 'Workout'];

type Props = {
  profile: CompleteProfileResponseDto;
  onSuccess: () => void;
  onError: (error: string) => void;
};

export function MusicPreferencesSection({ profile, onSuccess, onError }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [genreInput, setGenreInput] = useState('');
  const [showMore, setShowMore] = useState(false);

  const form = useForm<MusicPreferencesRequestDto>({
    resolver: zodResolver(schema),
    defaultValues: {
      favoriteGenres: profile.musicPreferences?.favoriteGenres || [],
      concertFrequency: profile.musicPreferences?.concertFrequency || ConcertFrequency.RARELY,
      musicImportance: profile.musicPreferences?.musicImportance || MusicImportance.IMPORTANT,
      favoriteDecades: profile.musicPreferences?.favoriteDecades || [],
      openToNewGenres: profile.musicPreferences?.openToNewGenres ?? true,
      listeningTimes: profile.musicPreferences?.listeningTimes || [],
      hoursPerDay: profile.musicPreferences?.hoursPerDay,
    },
  });

  const onSubmit = async (formData: MusicPreferencesRequestDto) => {
    setIsLoading(true);

    const result = await saveMusicPreferences(formData);

    if (result.ok) {
      setIsEditing(false);
      onSuccess();
    } else {
      onError(result.error.message);
    }

    setIsLoading(false);
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  const addGenre = () => {
    if (genreInput.trim()) {
      const currentGenres = form.getValues('favoriteGenres');
      if (!currentGenres.includes(genreInput.trim())) {
        form.setValue('favoriteGenres', [...currentGenres, genreInput.trim()]);
      }
      setGenreInput('');
    }
  };

  const removeGenre = (genre: string) => {
    const currentGenres = form.getValues('favoriteGenres');
    form.setValue(
      'favoriteGenres',
      currentGenres.filter((g) => g !== genre)
    );
  };

  const toggleListeningTime = (time: string) => {
    const current = form.getValues('listeningTimes') || [];
    form.setValue(
      'listeningTimes',
      current.includes(time) ? current.filter((t) => t !== time) : [...current, time]
    );
  };

  return (
    <AnimatePresence mode="wait">
      {!isEditing ? (
        <motion.div key="view" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Music className="w-5 h-5" />
                Music Preferences
              </h2>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            </div>

            {profile.musicPreferences ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Favorite Genres</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.musicPreferences.favoriteGenres.map((genre) => (
                      <Badge key={genre} variant="secondary">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Concert Frequency</p>
                    <p className="text-foreground font-medium">{formatEnumValue(profile.musicPreferences.concertFrequency)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Music Importance</p>
                    <p className="text-foreground font-medium">{formatEnumValue(profile.musicPreferences.musicImportance)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Open to New Genres</p>
                    <p className="text-foreground font-medium">{profile.musicPreferences.openToNewGenres ? 'Yes' : 'No'}</p>
                  </div>
                  {profile.musicPreferences.hoursPerDay !== undefined && (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Hours Per Day</p>
                      <p className="text-foreground font-medium">{profile.musicPreferences.hoursPerDay} hours</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No music preferences set</p>
            )}
          </Card>
        </motion.div>
      ) : (
        <motion.div key="edit" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <Card className="p-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Music className="w-5 h-5" />
              Edit Music Preferences
            </h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="favoriteGenres"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Favorite Genres</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add a genre"
                              value={genreInput}
                              onChange={(e) => setGenreInput(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addGenre();
                                }
                              }}
                            />
                            <Button type="button" onClick={addGenre} variant="outline">
                              Add
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {field.value.map((genre) => (
                              <Badge key={genre} variant="secondary" className="gap-1">
                                {genre}
                                <X className="h-3 w-3 cursor-pointer" onClick={() => removeGenre(genre)} />
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="concertFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How often do you go to concerts?</FormLabel>
                      <FormControl>
                        <div className="flex flex-wrap gap-2">
                          {Object.values(ConcertFrequency).map((freq) => (
                            <Badge
                              key={freq}
                              variant={field.value === freq ? 'default' : 'outline'}
                              className="cursor-pointer px-4 py-2 text-sm"
                              onClick={() => field.onChange(freq)}>
                              {formatEnumValue(freq)}
                            </Badge>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="musicImportance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How important is music to you?</FormLabel>
                      <FormControl>
                        <div className="flex flex-wrap gap-2">
                          {Object.values(MusicImportance).map((importance) => (
                            <Badge
                              key={importance}
                              variant={field.value === importance ? 'default' : 'outline'}
                              className="cursor-pointer px-4 py-2 text-sm"
                              onClick={() => field.onChange(importance)}>
                              {formatEnumValue(importance)}
                            </Badge>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="openToNewGenres"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Open to New Genres</FormLabel>
                        <FormDescription>Are you interested in discovering new music genres?</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <button
                  type="button"
                  onClick={() => setShowMore((v) => !v)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
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
                          <FormLabel>When do you listen to music? (Optional)</FormLabel>
                          <div className="flex flex-wrap gap-2">
                            {LISTENING_TIMES.map((time) => (
                              <Badge
                                key={time}
                                variant={form.watch('listeningTimes')?.includes(time) ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => toggleListeningTime(time)}>
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

                <div className="flex gap-3">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
