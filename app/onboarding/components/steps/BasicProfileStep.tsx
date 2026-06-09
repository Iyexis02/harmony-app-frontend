'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Gender, SexualOrientation } from '@/app/enums/user/userEnum';
import type { BasicProfileRequestDto } from '@/types/onboarding';
import { saveBasicProfile } from '@/app/serverActions/onboarding';
import { applyBackendErrors } from '@/lib/formErrors';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, User } from 'lucide-react';
import { formatEnumValue } from '@/lib/profileHelpers';
import SectionHeader from '../SectionHeader';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  dateOfBirth: z.string().refine(
    (date) => {
      const age = new Date().getFullYear() - new Date(date).getFullYear();
      return age >= 18 && age <= 100;
    },
    { message: 'Must be 18-100 years old' }
  ),
  gender: z.nativeEnum(Gender, { message: 'Please select your gender' }),
  sexualOrientation: z.nativeEnum(SexualOrientation, { message: 'Please select your sexual orientation' }),
});

type Props = {
  data?: BasicProfileRequestDto;
  onNext: (data: BasicProfileRequestDto) => void;
};

export default function BasicProfileStep({ data, onNext }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<BasicProfileRequestDto>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: data || {
      name: '',
      dateOfBirth: '',
      gender: undefined,
      sexualOrientation: undefined,
    },
  });

  const onSubmit = async (formData: BasicProfileRequestDto) => {
    setIsLoading(true);
    setError(null);

    const result = await saveBasicProfile(formData);

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
        icon={User}
        roman="I"
        eyebrow="act one · the overture"
        title="First, your"
        accent="name in lights."
        description="The opening notes — how you appear to anyone who finds you. You can refine any of this later."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Your name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>Must be 18+</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(Gender).map((gender) => (
                      <Badge
                        key={gender}
                        variant={field.value === gender ? 'default' : 'outline'}
                        className="cursor-pointer px-4 py-2 text-sm"
                        onClick={() => field.onChange(gender)}
                      >
                        {formatEnumValue(gender)}
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
            name="sexualOrientation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sexual Orientation <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(SexualOrientation).map((orientation) => (
                      <Badge
                        key={orientation}
                        variant={field.value === orientation ? 'default' : 'outline'}
                        className="cursor-pointer px-4 py-2 text-sm"
                        onClick={() => field.onChange(orientation)}
                      >
                        {formatEnumValue(orientation)}
                      </Badge>
                    ))}
                  </div>
                </FormControl>
                <p className="text-xs text-muted-foreground flex gap-1 items-center mt-1">
                  🔒 Only used to show you relevant matches. Never shown publicly.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full rounded-full v-cta-gold" disabled={isLoading}>
            {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Continue'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
