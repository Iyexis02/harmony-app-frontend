'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { MBTI } from '@/app/enums/user/userEnum';
import { savePersonality } from '@/app/serverActions/onboarding';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatEnumValue } from '@/lib/profileHelpers';
import type { CompleteProfileResponseDto, PersonalityRequestDto } from '@/types/onboarding';

const schema = z.object({
  bio: z.string().min(10, 'Bio must be at least 10 characters').max(500, 'Bio must be at most 500 characters'),
  interests: z.array(z.string()).optional(),
  mbti: z.nativeEnum(MBTI).optional(),
  lookingForText: z.string().max(500).optional(),
  favoriteQuote: z.string().max(300).optional(),
  conversationStarters: z.string().max(500).optional(),
});

type Props = {
  profile: CompleteProfileResponseDto;
  onSuccess: () => void;
  onError: (error: string) => void;
};

export function PersonalitySection({ profile, onSuccess, onError }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [interestInput, setInterestInput] = useState('');

  const form = useForm<PersonalityRequestDto>({
    resolver: zodResolver(schema),
    defaultValues: {
      bio: profile.personality?.bio || '',
      interests: profile.personality?.interests || [],
      // Backend returns `null` for an unset MBTI; the Zod schema is `.optional()` (undefined only),
      // so a null here fails validation and silently blocks the whole save. Normalize null → undefined.
      mbti: profile.personality?.mbti ?? undefined,
      lookingForText: profile.personality?.lookingForText || '',
      favoriteQuote: profile.personality?.favoriteQuote || '',
      conversationStarters: profile.personality?.conversationStarters || '',
    },
  });

  const onSubmit = async (formData: PersonalityRequestDto) => {
    setIsLoading(true);

    const result = await savePersonality(formData);

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

  const addInterest = () => {
    if (interestInput.trim()) {
      const currentInterests = form.getValues('interests') || [];
      if (!currentInterests.includes(interestInput.trim())) {
        form.setValue('interests', [...currentInterests, interestInput.trim()]);
      }
      setInterestInput('');
    }
  };

  const removeInterest = (interest: string) => {
    const currentInterests = form.getValues('interests') || [];
    form.setValue(
      'interests',
      currentInterests.filter((i) => i !== interest)
    );
  };

  return (
    <AnimatePresence mode="wait">
      {!isEditing ? (
        <motion.div key="view" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Personality
              </h2>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            </div>

            {profile.personality ? (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Bio</p>
                  <p className="text-foreground">{profile.personality.bio}</p>
                </div>

                {profile.personality.interests && profile.personality.interests.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.personality.interests.map((interest) => (
                        <Badge key={interest} variant="default">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {profile.personality.mbti && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">MBTI Type</p>
                    <p className="text-foreground font-medium">{profile.personality.mbti}</p>
                  </div>
                )}

                {profile.personality.lookingForText && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">What I'm Looking For</p>
                    <p className="text-foreground">{profile.personality.lookingForText}</p>
                  </div>
                )}

                {profile.personality.favoriteQuote && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Favorite Quote</p>
                    <p className="text-foreground italic">&ldquo;{profile.personality.favoriteQuote}&rdquo;</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No personality information set</p>
            )}
          </Card>
        </motion.div>
      ) : (
        <motion.div key="edit" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <Card className="p-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5" />
              Edit Personality
            </h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Tell us about yourself..." rows={4} maxLength={500} {...field} />
                      </FormControl>
                      <FormDescription>{field.value.length}/500 characters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interests (Optional)</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add an interest"
                              value={interestInput}
                              onChange={(e) => setInterestInput(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addInterest();
                                }
                              }}
                            />
                            <Button type="button" onClick={addInterest} variant="outline">
                              Add
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {field.value?.map((interest) => (
                              <Badge key={interest} variant="default" className="gap-1">
                                {interest}
                                <X className="h-3 w-3 cursor-pointer" onClick={() => removeInterest(interest)} />
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
                  name="mbti"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MBTI Type (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select MBTI type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(MBTI).map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Myers-Briggs Type Indicator —{' '}
                        <a
                          href="https://www.16personalities.com/free-personality-test"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline">
                          take the free test
                        </a>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lookingForText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What I'm Looking For (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe what you're looking for..." rows={3} maxLength={500} {...field} />
                      </FormControl>
                      <FormDescription>{field.value?.length || 0}/500 characters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="favoriteQuote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Favorite Quote (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Your favorite quote..." maxLength={300} {...field} />
                      </FormControl>
                      <FormDescription>{field.value?.length || 0}/300 characters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="conversationStarters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conversation Starters (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Give people ideas to start a conversation..." rows={2} maxLength={500} {...field} />
                      </FormControl>
                      <FormDescription>{field.value?.length || 0}/500 characters</FormDescription>
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
