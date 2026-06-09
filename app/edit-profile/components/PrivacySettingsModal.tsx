'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Shield } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { savePrivacySettings } from '@/app/serverActions/onboarding';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import type { PrivacySettingsRequestDto, PrivacySettingsResponseDto } from '@/types/onboarding';

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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSettings: PrivacySettingsResponseDto | null | undefined;
  onSuccess: () => void;
  onError: (error: string) => void;
};

export function PrivacySettingsModal({ open, onOpenChange, initialSettings, onSuccess, onError }: Props) {
  const [saving, setSaving] = useState(false);

  const form = useForm<PrivacySettingsRequestDto>({
    resolver: zodResolver(schema),
    defaultValues: {
      isProfilePublic: initialSettings?.isProfilePublic ?? true,
      showAge: initialSettings?.showAge ?? true,
      showDistance: initialSettings?.showDistance ?? true,
      showLastActive: initialSettings?.showLastActive ?? true,
      discoverable: initialSettings?.discoverable ?? true,
      showLikedByYou: initialSettings?.showLikedByYou ?? false,
      showSpotifyProfile: initialSettings?.showSpotifyProfile ?? true,
      showMusicStats: initialSettings?.showMusicStats ?? true,
      incognitoMode: initialSettings?.incognitoMode ?? false,
      readReceipts: initialSettings?.readReceipts ?? true,
    },
  });

  const handleSave = async (formData: PrivacySettingsRequestDto) => {
    setSaving(true);

    const result = await savePrivacySettings(formData);

    if (result.ok) {
      onSuccess();
      onOpenChange(false);
    } else {
      onError(result.error.message);
    }

    setSaving(false);
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy Settings
          </DialogTitle>
          <DialogDescription>Control who can see your profile and information</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <FormField
              control={form.control}
              name="isProfilePublic"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Public Profile</FormLabel>
                    <FormDescription>Make your profile visible to other users</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discoverable"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Discoverable</FormLabel>
                    <FormDescription>Allow others to discover your profile in search</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showAge"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
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
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Show Distance</FormLabel>
                    <FormDescription>Display your distance to other users</FormDescription>
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
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Show Last Active</FormLabel>
                    <FormDescription>Display when you were last active</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="showSpotifyProfile"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Show Spotify Profile</FormLabel>
                    <FormDescription>Display your Spotify profile information</FormDescription>
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
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Show Music Stats</FormLabel>
                    <FormDescription>Display your music listening statistics</FormDescription>
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
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Read Receipts</FormLabel>
                    <FormDescription>Let others know when you've read their messages</FormDescription>
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
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Incognito Mode</FormLabel>
                    <FormDescription>Browse profiles without others seeing you</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={saving} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
