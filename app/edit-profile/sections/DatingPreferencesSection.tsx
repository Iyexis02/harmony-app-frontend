'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Gender, RelationshipGoal } from '@/app/enums/user/userEnum';
import { saveDatingPreferences } from '@/app/serverActions/onboarding';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import { formatAgeRange, formatDistance, formatEnumValue, formatList } from '@/lib/profileHelpers';
import type { CompleteProfileResponseDto, DatingPreferencesRequestDto } from '@/types/onboarding';

const schema = z
  .object({
    minAge: z.number().min(18, 'Minimum age is 18').max(100),
    maxAge: z.number().min(18).max(100),
    maxDistanceKm: z.number().min(1, 'Distance must be at least 1 km'),
    interestedInGenders: z.array(z.nativeEnum(Gender)).min(1, 'Select at least one gender'),
    relationshipGoal: z.nativeEnum(RelationshipGoal),
    dealBreakers: z.array(z.string()).optional(),
    showMe: z.string().optional(),
    musicMatchImportance: z.number().min(0).max(100).optional(),
  })
  .refine((data) => data.minAge < data.maxAge, {
    message: 'Minimum age must be less than maximum age',
    path: ['minAge'],
  });

// Exclude PREFER_NOT_TO_SAY from the "interested in" picker
const SELECTABLE_GENDERS = Object.values(Gender).filter((g) => g !== Gender.PREFER_NOT_TO_SAY);

type Props = {
  profile: CompleteProfileResponseDto;
  onSuccess: () => void;
  onError: (error: string) => void;
};

export function DatingPreferencesSection({ profile, onSuccess, onError }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<DatingPreferencesRequestDto>({
    resolver: zodResolver(schema),
    defaultValues: {
      minAge: profile.datingPreferences?.minAge || 18,
      maxAge: profile.datingPreferences?.maxAge || 35,
      maxDistanceKm: profile.datingPreferences?.maxDistanceKm || 50,
      interestedInGenders: profile.datingPreferences?.interestedInGenders || [],
      relationshipGoal: profile.datingPreferences?.relationshipGoal || RelationshipGoal.FIGURING_IT_OUT,
      dealBreakers: profile.datingPreferences?.dealBreakers || [],
      showMe: profile.datingPreferences?.showMe || '',
      musicMatchImportance: profile.datingPreferences?.musicMatchImportance || 50,
    },
  });

  const toggleGender = (gender: Gender) => {
    const current = form.getValues('interestedInGenders');
    if (current.includes(gender)) {
      form.setValue('interestedInGenders', current.filter((g) => g !== gender));
    } else {
      form.setValue('interestedInGenders', [...current, gender]);
    }
  };

  const onSubmit = async (formData: DatingPreferencesRequestDto) => {
    setIsLoading(true);

    const result = await saveDatingPreferences(formData);

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

  return (
    <AnimatePresence mode="wait">
      {!isEditing ? (
        <motion.div key="view" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Dating Preferences
              </h2>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            </div>

            {profile.datingPreferences ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Age Range</p>
                    <p className="text-foreground font-medium">
                      {formatAgeRange(profile.datingPreferences.minAge, profile.datingPreferences.maxAge)}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Max Distance</p>
                    <p className="text-foreground font-medium">{formatDistance(profile.datingPreferences.maxDistanceKm)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Interested In</p>
                    <p className="text-foreground font-medium">
                      {formatList(profile.datingPreferences.interestedInGenders.map((g) => formatEnumValue(g)))}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Relationship Goal</p>
                    <p className="text-foreground font-medium">{formatEnumValue(profile.datingPreferences.relationshipGoal)}</p>
                  </div>
                  {profile.datingPreferences.musicMatchImportance !== undefined && (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Music Match Importance</p>
                      <p className="text-foreground font-medium">{profile.datingPreferences.musicMatchImportance}%</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No dating preferences set</p>
            )}
          </Card>
        </motion.div>
      ) : (
        <motion.div key="edit" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <Card className="p-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5" />
              Edit Dating Preferences
            </h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="interestedInGenders"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>I&apos;m interested in</FormLabel>
                      <div className="flex flex-wrap gap-3">
                        {SELECTABLE_GENDERS.map((gender) => (
                          <Badge
                            key={gender}
                            variant={field.value.includes(gender) ? 'default' : 'outline'}
                            className="cursor-pointer px-4 py-2 text-sm"
                            onClick={() => toggleGender(gender)}>
                            {formatEnumValue(gender)}
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minAge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Age range: {form.watch('minAge')} – {form.watch('maxAge')}
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={18}
                          max={100}
                          step={1}
                          value={[field.value, form.watch('maxAge')]}
                          onValueChange={(vals) => {
                            field.onChange(vals[0]);
                            form.setValue('maxAge', vals[1]);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxDistanceKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum distance: {field.value} km</FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={500}
                          step={5}
                          value={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                        />
                      </FormControl>
                      <FormDescription>How far are you willing to travel?</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="relationshipGoal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What are you looking for?</FormLabel>
                      <FormControl>
                        <div className="flex flex-wrap gap-2">
                          {Object.values(RelationshipGoal).map((goal) => (
                            <Badge
                              key={goal}
                              variant={field.value === goal ? 'default' : 'outline'}
                              className="cursor-pointer px-4 py-2 text-sm"
                              onClick={() => field.onChange(goal)}>
                              {formatEnumValue(goal)}
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
                  name="musicMatchImportance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How important is music compatibility? {field.value ?? 50}/100</FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={[field.value || 50]}
                          onValueChange={(value) => field.onChange(value[0])}
                        />
                      </FormControl>
                      <FormDescription>0 = Not important, 100 = Music is everything</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
