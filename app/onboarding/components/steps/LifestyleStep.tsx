'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LifestyleRequestDto } from '@/types/onboarding';
import {
  RelationshipStatus,
  EducationLevel,
  KidsPreference,
  SmokingHabits,
  DrinkingHabits,
  ExerciseFrequency,
  Religion,
  PoliticalViews,
} from '@/app/enums/user/userEnum';
import { saveLifestyle } from '@/app/serverActions/onboarding';
import { applyBackendErrors } from '@/lib/formErrors';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Leaf } from 'lucide-react';
import { formatEnumValue } from '@/lib/profileHelpers';
import SectionHeader from '../SectionHeader';

const schema = z.object({
  education: z.nativeEnum(EducationLevel).optional(),
  occupation: z.string().max(100).optional(),
  relationshipStatus: z.nativeEnum(RelationshipStatus),
  wantsKids: z.nativeEnum(KidsPreference).optional(),
  smokingHabits: z.nativeEnum(SmokingHabits).optional(),
  drinkingHabits: z.nativeEnum(DrinkingHabits).optional(),
  exerciseFrequency: z.nativeEnum(ExerciseFrequency).optional(),
  religion: z.nativeEnum(Religion).optional(),
  politicalViews: z.nativeEnum(PoliticalViews).optional(),
});

type Props = {
  data?: LifestyleRequestDto;
  onNext: (data: LifestyleRequestDto) => void;
  onBack: () => void;
};

export default function LifestyleStep({ data, onNext, onBack }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHabits, setShowHabits] = useState(false);
  const [showValues, setShowValues] = useState(false);

  const form = useForm<LifestyleRequestDto>({
    resolver: zodResolver(schema),
    defaultValues: data || {
      relationshipStatus: RelationshipStatus.SINGLE,
    },
  });

  const onSubmit = async (formData: LifestyleRequestDto) => {
    setIsLoading(true);
    setError(null);
    const result = await saveLifestyle(formData);
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
        icon={Leaf}
        roman="V"
        eyebrow="act five · ordinary days"
        title="What does a normal"
        accent="Tuesday look like?"
        description="The shape of your week — work, habits, what you carry. Share what feels right."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Basics ─────────────────────────────────── */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basics</p>

            <FormField
              control={form.control}
              name="education"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Education <span className="text-muted-foreground text-xs font-normal">(optional)</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              name="occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Occupation <span className="text-muted-foreground text-xs font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Software Engineer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="relationshipStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship Status <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <FormLabel>Do you want kids? <span className="text-muted-foreground text-xs font-normal">(optional)</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
          </div>

          {/* ── Habits (collapsible) ───────────────────── */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowHabits((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Habits
              </span>
              {showHabits ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {showHabits && (
              <div className="p-4 space-y-4">
                <FormField
                  control={form.control}
                  name="smokingHabits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Smoking <span className="text-muted-foreground text-xs font-normal">(optional)</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select smoking habits" />
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
                      <FormLabel>Drinking <span className="text-muted-foreground text-xs font-normal">(optional)</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select drinking habits" />
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

                <FormField
                  control={form.control}
                  name="exerciseFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exercise <span className="text-muted-foreground text-xs font-normal">(optional)</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="How often do you exercise?" />
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
              </div>
            )}
          </div>

          {/* ── Values (collapsible) ───────────────────── */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowValues((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Values
              </span>
              {showValues ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {showValues && (
              <div className="p-4 space-y-4">
                <p className="text-xs text-muted-foreground">
                  🔒 Optional. Used only in matching. You can leave these blank.
                </p>

                <FormField
                  control={form.control}
                  name="religion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Religion <span className="text-muted-foreground text-xs font-normal">(optional)</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <FormLabel>Political Views <span className="text-muted-foreground text-xs font-normal">(optional)</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              </div>
            )}
          </div>

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
