'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Briefcase, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  DrinkingHabits,
  EducationLevel,
  ExerciseFrequency,
  KidsPreference,
  PoliticalViews,
  RelationshipStatus,
  Religion,
  SmokingHabits,
} from '@/app/enums/user/userEnum';
import { saveLifestyle } from '@/app/serverActions/onboarding';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatEnumValue } from '@/lib/profileHelpers';
import type { CompleteProfileResponseDto, LifestyleRequestDto } from '@/types/onboarding';

const schema = z.object({
  education: z.nativeEnum(EducationLevel).optional(),
  occupation: z.string().optional(),
  relationshipStatus: z.nativeEnum(RelationshipStatus),
  wantsKids: z.nativeEnum(KidsPreference).optional(),
  smokingHabits: z.nativeEnum(SmokingHabits).optional(),
  drinkingHabits: z.nativeEnum(DrinkingHabits).optional(),
  exerciseFrequency: z.nativeEnum(ExerciseFrequency).optional(),
  religion: z.nativeEnum(Religion).optional(),
  politicalViews: z.nativeEnum(PoliticalViews).optional(),
});

type Props = {
  profile: CompleteProfileResponseDto;
  onSuccess: () => void;
  onError: (error: string) => void;
};

export function LifestyleSection({ profile, onSuccess, onError }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LifestyleRequestDto>({
    resolver: zodResolver(schema),
    defaultValues: {
      // Backend returns `null` for unset optional enums; the Zod schema is `.optional()`
      // (undefined only), so a null fails validation and silently blocks the entire save.
      // Normalize null → undefined so untouched fields stay omitted (matches onboarding's contract).
      education: profile.lifestyle?.education ?? undefined,
      occupation: profile.lifestyle?.occupation || '',
      relationshipStatus: profile.lifestyle?.relationshipStatus || RelationshipStatus.SINGLE,
      wantsKids: profile.lifestyle?.wantsKids ?? undefined,
      smokingHabits: profile.lifestyle?.smokingHabits ?? undefined,
      drinkingHabits: profile.lifestyle?.drinkingHabits ?? undefined,
      exerciseFrequency: profile.lifestyle?.exerciseFrequency ?? undefined,
      religion: profile.lifestyle?.religion ?? undefined,
      politicalViews: profile.lifestyle?.politicalViews ?? undefined,
    },
  });

  const onSubmit = async (formData: LifestyleRequestDto) => {
    setIsLoading(true);

    const result = await saveLifestyle(formData);

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
                <Briefcase className="w-5 h-5" />
                Lifestyle
              </h2>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            </div>

            {profile.lifestyle ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.lifestyle.occupation && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Occupation</p>
                    <p className="text-foreground font-medium">{profile.lifestyle.occupation}</p>
                  </div>
                )}
                {profile.lifestyle.education && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Education</p>
                    <p className="text-foreground font-medium">{formatEnumValue(profile.lifestyle.education)}</p>
                  </div>
                )}
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Relationship Status</p>
                  <p className="text-foreground font-medium">{formatEnumValue(profile.lifestyle.relationshipStatus)}</p>
                </div>
                {profile.lifestyle.wantsKids && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Kids Preference</p>
                    <p className="text-foreground font-medium">{formatEnumValue(profile.lifestyle.wantsKids)}</p>
                  </div>
                )}
                {profile.lifestyle.smokingHabits && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Smoking</p>
                    <p className="text-foreground font-medium">{formatEnumValue(profile.lifestyle.smokingHabits)}</p>
                  </div>
                )}
                {profile.lifestyle.drinkingHabits && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Drinking</p>
                    <p className="text-foreground font-medium">{formatEnumValue(profile.lifestyle.drinkingHabits)}</p>
                  </div>
                )}
                {profile.lifestyle.exerciseFrequency && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Exercise</p>
                    <p className="text-foreground font-medium">{formatEnumValue(profile.lifestyle.exerciseFrequency)}</p>
                  </div>
                )}
                {(profile.lifestyle as any)?.religion && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Religion</p>
                    <p className="text-foreground font-medium">{formatEnumValue((profile.lifestyle as any).religion)}</p>
                  </div>
                )}
                {(profile.lifestyle as any)?.politicalViews && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Political Views</p>
                    <p className="text-foreground font-medium">{formatEnumValue((profile.lifestyle as any).politicalViews)}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No lifestyle information set</p>
            )}
          </Card>
        </motion.div>
      ) : (
        <motion.div key="edit" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <Card className="p-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5" />
              Edit Lifestyle
            </h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Occupation (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Software Engineer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Education Level (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select education level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(EducationLevel).map((level) => (
                            <SelectItem key={level} value={level}>
                              {formatEnumValue(level)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="relationshipStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(RelationshipStatus).map((status) => (
                            <SelectItem key={status} value={status}>
                              {formatEnumValue(status)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wantsKids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kids Preference (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select preference" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(KidsPreference).map((pref) => (
                            <SelectItem key={pref} value={pref}>
                              {formatEnumValue(pref)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="smokingHabits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Smoking (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select habit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(SmokingHabits).map((habit) => (
                              <SelectItem key={habit} value={habit}>
                                {formatEnumValue(habit)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="drinkingHabits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Drinking (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select habit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(DrinkingHabits).map((habit) => (
                              <SelectItem key={habit} value={habit}>
                                {formatEnumValue(habit)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="exerciseFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exercise Frequency (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(ExerciseFrequency).map((freq) => (
                            <SelectItem key={freq} value={freq}>
                              {formatEnumValue(freq)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="religion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Religion (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select religion" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(Religion).map((r) => (
                            <SelectItem key={r} value={r}>
                              {formatEnumValue(r)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="politicalViews"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Political Views (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select political views" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(PoliticalViews).map((p) => (
                            <SelectItem key={p} value={p}>
                              {formatEnumValue(p)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
