'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Gender, RelationshipGoal } from '@/app/enums/user/userEnum';
import { saveDatingPreferences } from '@/app/serverActions/onboarding';
import { applyBackendErrors } from '@/lib/formErrors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Target } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import type { DatingPreferencesRequestDto } from '@/types/onboarding';
import { formatEnumValue } from '@/lib/profileHelpers';
import SectionHeader from '../SectionHeader';

const schema = z
  .object({
    minAge: z.number().min(18, 'Minimum age is 18').max(100),
    maxAge: z.number().min(18).max(100, 'Maximum age is 100'),
    maxDistanceKm: z.number().min(1).max(500),
    interestedInGenders: z.array(z.nativeEnum(Gender)).min(1, 'Select at least one gender'),
    relationshipGoal: z.nativeEnum(RelationshipGoal, {
      error: 'Please select a relationship goal',
    }),
    dealBreakers: z.array(z.string()).optional(),
    showMe: z.string().optional(),
    musicMatchImportance: z.number().min(0).max(100).optional(),
  })
  .refine((data) => data.minAge <= data.maxAge, {
    message: 'Minimum age must be less than or equal to maximum age',
    path: ['maxAge'],
  });

type Props = {
  data?: DatingPreferencesRequestDto;
  onNext: (data: DatingPreferencesRequestDto) => void;
  onBack: () => void;
};

const SUGGESTED_DEALBREAKERS = [
  'Smoking',
  'Drugs',
  'No sense of humor',
  'Different music taste',
  'Poor communication',
  'Not ambitious',
  'Different life goals',
  'No interest in concerts',
];

const SELECTABLE_GENDERS = Object.values(Gender).filter((g) => g !== Gender.PREFER_NOT_TO_SAY);

export default function DatingPreferencesStep({ data, onNext, onBack }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dealBreakerInput, setDealBreakerInput] = useState('');

  const form = useForm<DatingPreferencesRequestDto>({
    resolver: zodResolver(schema),
    defaultValues: data || {
      minAge: 22,
      maxAge: 35,
      maxDistanceKm: 50,
      interestedInGenders: [],
      dealBreakers: [],
      showMe: '',
      musicMatchImportance: 70,
    },
  });

  const handleAddDealBreaker = (dealBreaker: string) => {
    const currentDealBreakers = form.getValues('dealBreakers') || [];
    if (!currentDealBreakers.includes(dealBreaker) && currentDealBreakers.length < 8) {
      form.setValue('dealBreakers', [...currentDealBreakers, dealBreaker]);
    }
  };

  const handleRemoveDealBreaker = (dealBreaker: string) => {
    const currentDealBreakers = form.getValues('dealBreakers') || [];
    form.setValue(
      'dealBreakers',
      currentDealBreakers.filter((d) => d !== dealBreaker)
    );
  };

  const handleAddCustomDealBreaker = () => {
    if (dealBreakerInput.trim()) {
      handleAddDealBreaker(dealBreakerInput.trim());
      setDealBreakerInput('');
    }
  };

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
    setError(null);

    const result = await saveDatingPreferences(formData);

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
        icon={Target}
        roman="VII"
        eyebrow="act seven · who you'd cast"
        title="Who’s sitting"
        accent="next to you?"
        description="You’re on the page. Now we look outward — these filters shape every match we send."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Interested in genders */}
          <FormField
            control={form.control}
            name="interestedInGenders"
            render={({ field }) => (
              <FormItem>
                <FormLabel>I&apos;m interested in <span className="text-destructive">*</span></FormLabel>
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

          {/* Age range */}
          <div className="space-y-4">
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
                      onValueCommit={() => {
                        form.trigger(['minAge', 'maxAge']);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Max distance */}
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

          {/* Relationship goal */}
          <FormField
            control={form.control}
            name="relationshipGoal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What are you looking for? <span className="text-destructive">*</span></FormLabel>
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

          {/* Music match importance */}
          <FormField
            control={form.control}
            name="musicMatchImportance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>How important is music compatibility? {field.value ?? 70}/100</FormLabel>
                <FormControl>
                  <Slider
                    min={0}
                    max={100}
                    step={5}
                    value={[field.value ?? 70]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                  />
                </FormControl>
                <FormDescription>0 = Not important, 100 = Music is everything</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Deal breakers */}
          <FormField
            control={form.control}
            name="dealBreakers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Deal breakers{' '}
                  {field.value && field.value.length > 0 && (
                    <span className={`text-xs font-normal ${field.value.length >= 8 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      ({field.value.length}/8)
                    </span>
                  )}{' '}
                  <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                </FormLabel>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_DEALBREAKERS.map((dealBreaker) => {
                      const isSelected = field.value?.includes(dealBreaker);
                      const atLimit = (field.value?.length ?? 0) >= 8;
                      return (
                        <Badge
                          key={dealBreaker}
                          variant={isSelected ? 'default' : 'outline'}
                          className={`cursor-pointer ${!isSelected && atLimit ? 'opacity-50 pointer-events-none' : ''}`}
                          onClick={() =>
                            isSelected ? handleRemoveDealBreaker(dealBreaker) : handleAddDealBreaker(dealBreaker)
                          }>
                          {dealBreaker} {isSelected && '×'}
                        </Badge>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder={(field.value?.length ?? 0) >= 8 ? 'Maximum reached' : 'Add custom deal breaker'}
                      value={dealBreakerInput}
                      onChange={(e) => setDealBreakerInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomDealBreaker())}
                      disabled={(field.value?.length ?? 0) >= 8}
                    />
                    <Button type="button" onClick={handleAddCustomDealBreaker} disabled={(field.value?.length ?? 0) >= 8}>
                      Add
                    </Button>
                  </div>

                  {field.value && field.value.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Your deal breakers:</p>
                      <div className="flex flex-wrap gap-2">
                        {field.value.map((dealBreaker) => (
                          <Badge
                            key={dealBreaker}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => handleRemoveDealBreaker(dealBreaker)}>
                            {dealBreaker} ×
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Additional preferences */}
          <FormField
            control={form.control}
            name="showMe"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional preferences <span className="text-muted-foreground text-xs font-normal">(optional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Must love live music" {...field} />
                </FormControl>
                <FormDescription>Any other specific preferences</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

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
