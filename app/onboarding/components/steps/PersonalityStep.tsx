'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { MBTI } from '@/app/enums/user/userEnum';
import { savePersonality } from '@/app/serverActions/onboarding';
import { applyBackendErrors } from '@/lib/formErrors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { PersonalityRequestDto } from '@/types/onboarding';
import { Loader2, ThumbsUp } from 'lucide-react';
import SectionHeader from '../SectionHeader';

const schema = z.object({
  bio: z.string().min(20, 'Bio must be at least 20 characters').max(500, 'Bio must be less than 500 characters'),
  interests: z.array(z.string()).optional(),
  mbti: z.nativeEnum(MBTI).optional(),
  lookingForText: z.string().max(500).optional(),
  favoriteQuote: z.string().max(300).optional(),
  conversationStarters: z.string().max(500).optional(),
});

type Props = {
  data?: PersonalityRequestDto;
  onNext: (data: PersonalityRequestDto) => void;
  onBack: () => void;
};

const SUGGESTED_INTERESTS = [
  'Live Music',
  'Concerts',
  'Travel',
  'Hiking',
  'Cooking',
  'Photography',
  'Reading',
  'Gaming',
  'Fitness',
  'Art',
  'Movies',
  'Sports',
  'Dancing',
  'Wine Tasting',
  'Coffee',
  'Food',
  'Fashion',
  'Technology',
  'Nature',
  'Yoga',
];

export default function PersonalityStep({ data, onNext, onBack }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interestInput, setInterestInput] = useState('');

  const form = useForm<PersonalityRequestDto>({
    resolver: zodResolver(schema),
    defaultValues: data || {
      bio: '',
      interests: [],
      mbti: undefined,
      lookingForText: '',
      favoriteQuote: '',
      conversationStarters: '',
    },
  });

  const handleAddInterest = (interest: string) => {
    const currentInterests = form.getValues('interests') || [];
    if (!currentInterests.includes(interest) && currentInterests.length < 10) {
      form.setValue('interests', [...currentInterests, interest]);
    }
  };

  const handleRemoveInterest = (interest: string) => {
    const currentInterests = form.getValues('interests') || [];
    form.setValue(
      'interests',
      currentInterests.filter((i) => i !== interest)
    );
  };

  const handleAddCustomInterest = () => {
    if (interestInput.trim()) {
      handleAddInterest(interestInput.trim());
      setInterestInput('');
    }
  };

  const bioLength = form.watch('bio')?.length || 0;
  const lookingForLength = form.watch('lookingForText')?.length || 0;
  const quoteLength = form.watch('favoriteQuote')?.length || 0;
  const startersLength = form.watch('conversationStarters')?.length || 0;

  const onSubmit = async (formData: PersonalityRequestDto) => {
    setIsLoading(true);
    setError(null);

    const result = await savePersonality(formData);

    if (result.ok) {
      onNext(formData);
    } else {
      applyBackendErrors(result.error, form.setError, setError);
    }

    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-8">
      <SectionHeader
        icon={ThumbsUp}
        roman="VI"
        eyebrow="act six · in your own words"
        title="Now you tell us — say something"
        accent="only you would."
        description="We have the facts. Your bio is what someone reads after the photos — make it sound like you."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">Bio</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell others about yourself, your passions, what makes you unique..."
                    className="resize-none min-h-[120px] rounded-2xl border-border/50"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">{bioLength}/500 characters (minimum 20)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interests"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">Your Interests</FormLabel>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_INTERESTS.map((interest) => {
                      const isSelected = field.value?.includes(interest);
                      return (
                        <Badge
                          key={interest}
                          variant={isSelected ? 'default' : 'outline'}
                          className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 ${
                            isSelected
                              ? 'bg-secondary hover:bg-secondary text-secondary-foreground border-secondary'
                              : 'bg-background hover:bg-muted border-border/50'
                          }`}
                          onClick={() => (isSelected ? handleRemoveInterest(interest) : handleAddInterest(interest))}
                        >
                          {interest}
                        </Badge>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add custom interest"
                      value={interestInput}
                      onChange={(e) => setInterestInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomInterest())}
                      className="rounded-full border-border/50"
                    />
                    <Button type="button" onClick={handleAddCustomInterest} className="rounded-full px-6">
                      Add
                    </Button>
                  </div>

                  {field.value && field.value.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Selected ({field.value.length}/10):</p>
                      <div className="flex flex-wrap gap-2">
                        {field.value.map((interest) => (
                          <Badge
                            key={interest}
                            className="cursor-pointer px-4 py-2 rounded-full bg-primary/10 hover:bg-primary/20 text-foreground border border-primary/20"
                            onClick={() => handleRemoveInterest(interest)}
                          >
                            {interest} ×
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <FormDescription className="text-xs">Optional — select up to 10 interests</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mbti"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">MBTI Type (Optional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="rounded-full border-border/50">
                      <SelectValue placeholder="Select your MBTI type" />
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
                    className="text-primary underline"
                  >
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
                <FormLabel className="text-base font-semibold">What I&apos;m looking for (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Someone to explore new music with"
                    className="rounded-full border-border/50"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">{lookingForLength}/500 characters</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="favoriteQuote"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">Favorite Quote (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="A quote that resonates with you"
                    className="rounded-full border-border/50"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">{quoteLength}/300 characters</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="conversationStarters"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">Conversation Starters (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Topics you love talking about or questions for potential matches"
                    className="resize-none min-h-20 rounded-2xl border-border/50"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">{startersLength}/500 characters</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
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
