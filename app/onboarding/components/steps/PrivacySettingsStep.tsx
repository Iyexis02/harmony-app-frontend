'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { PrivacySettingsRequestDto } from '@/types/onboarding';
import { savePrivacySettings } from '@/app/serverActions/onboarding';
import { applyBackendErrors } from '@/lib/formErrors';
import { useAutoSave } from '@/app/hooks/useAutoSave';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import SectionHeader from '../SectionHeader';

const schema = z.object({
  isProfilePublic: z.boolean(),
  showAge: z.boolean(),
  showDistance: z.boolean(),
  showLastActive: z.boolean(),
  discoverable: z.boolean(),
  showLikedByYou: z.boolean().optional(),
  showSpotifyProfile: z.boolean(),
  showMusicStats: z.boolean(),
  incognitoMode: z.boolean().optional(),
  readReceipts: z.boolean(),
});

type Props = {
  data?: PrivacySettingsRequestDto;
  onComplete: (data: PrivacySettingsRequestDto) => void;
  onBack: () => void;
};

export default function PrivacySettingsStep({ data, onComplete, onBack }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 3000);
    return () => clearTimeout(t);
  }, [savedAt]);

  const form = useForm<PrivacySettingsRequestDto>({
    resolver: zodResolver(schema),
    defaultValues: data || {
      isProfilePublic: true,
      showAge: true,
      showDistance: true,
      showLastActive: true,
      discoverable: true,
      showLikedByYou: false,
      showSpotifyProfile: true,
      showMusicStats: true,
      incognitoMode: false,
      readReceipts: true,
    },
  });

  useAutoSave(
    form.watch(),
    async (formData) => {
      const result = await savePrivacySettings(formData);
      if (result.ok) setSavedAt(new Date());
      return result;
    },
    2000
  );

  const onSubmit = async (formData: PrivacySettingsRequestDto) => {
    setIsLoading(true);
    setError(null);

    const result = await savePrivacySettings(formData);

    if (result.ok) {
      onComplete(formData);
    } else {
      applyBackendErrors(result.error, form.setError, setError);
    }

    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-8">
      <div className="relative">
        <SectionHeader
          icon={Shield}
          roman="VIII"
          eyebrow="act eight · the lighting"
          title="How visible do"
          accent="you want to be?"
          description="Last act. You control everything a potential match can see — defaults are sensible, change any of this anytime."
        />
        {savedAt && (
          <span
            aria-live="polite"
            className="absolute top-0 right-0 flex items-center gap-1 text-xs px-2 py-1 rounded-full animate-in fade-in duration-300"
            style={{
              color: 'var(--v-green)',
              background: 'rgba(167,211,155,.1)',
              border: '1px solid rgba(167,211,155,.3)',
            }}
          >
            <Check className="h-3 w-3" />
            Saved
          </span>
        )}
      </div>

      {/* Auto-save explanation */}
      <p className="text-xs text-muted-foreground mb-4">
        Changes are saved automatically as you toggle. Press <strong>Complete Setup</strong> when you&apos;re ready to continue.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Profile Visibility</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="isProfilePublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Public Profile</FormLabel>
                        <FormDescription>Make your profile visible to everyone</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(val) => {
                            field.onChange(val);
                            if (val) form.setValue('incognitoMode', false);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discoverable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Discoverable</FormLabel>
                        <FormDescription>Allow others to find you in discovery</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="incognitoMode"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Incognito Mode</FormLabel>
                        <FormDescription>
                          Only people you like can see your profile — overrides Public Profile when enabled
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(val) => {
                            field.onChange(val);
                            if (val) {
                              form.setValue('isProfilePublic', false);
                              form.setValue('discoverable', false);
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-3">Profile Information</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="showAge"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Show Age</FormLabel>
                        <FormDescription>Display your age on your profile</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="showDistance"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Show Distance</FormLabel>
                        <FormDescription>Show how far away you are from others</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="showLastActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Show Last Active</FormLabel>
                        <FormDescription>Let others see when you were last active</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-3">Music Integration</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="showSpotifyProfile"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Show Spotify Profile</FormLabel>
                        <FormDescription>Display your Spotify profile on your profile</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="showMusicStats"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Show Music Stats</FormLabel>
                        <FormDescription>Share your listening stats and top artists</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-3">Activity</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="showLikedByYou"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Show Liked By You</FormLabel>
                        <FormDescription>Let others see if you liked them</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="readReceipts"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Read Receipts</FormLabel>
                        <FormDescription>Show when you&apos;ve read messages</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
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
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Raising…</> : 'Raise the curtain'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
