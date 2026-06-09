'use client';

import { ArrowLeft, Loader2, Save, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { getCompleteProfile } from '@/app/serverActions/onboarding';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { CompleteProfileResponseDto } from '@/types/onboarding';

import { BasicInfoSection } from './sections/BasicInfoSection';
import { DatingPreferencesSection } from './sections/DatingPreferencesSection';
import { LifestyleSection } from './sections/LifestyleSection';
import { LocationSection } from './sections/LocationSection';
import { MusicPreferencesSection } from './sections/MusicPreferencesSection';
import { PersonalitySection } from './sections/PersonalitySection';
import { PhotosSection } from './sections/PhotosSection';
import { PrivacySettingsSection } from './sections/PrivacySettingsSection';

export default function EditProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CompleteProfileResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);

    const result = await getCompleteProfile();

    if (result.ok) {
      setProfile(result.data);
    } else {
      setError(result.error.message);
    }

    setIsLoading(false);
  };

  const handleSaveSuccess = async (section: string) => {
    toast.success(`${section} updated successfully!`);
    // Silently refresh profile in background without blocking the UI
    const result = await getCompleteProfile();
    if (result.ok) setProfile(result.data);
  };

  const handleSaveError = (section: string, error: string) => {
    toast.error(`Failed to update ${section}: ${error}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive text-lg mb-4">{error || 'Failed to load profile'}</p>
          <Button onClick={() => router.push('/profile')}>Back to Profile</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.push('/profile')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">Edit Profile</h1>
          <p className="text-muted-foreground">Update your profile information</p>
        </div>

        {/* Edit Sections */}
        <div className="space-y-6">
          <BasicInfoSection
            profile={profile}
            onSuccess={() => handleSaveSuccess('Basic Info')}
            onError={(error) => handleSaveError('Basic Info', error)}
          />

          <Separator />

          <LocationSection
            profile={profile}
            onSuccess={() => handleSaveSuccess('Location')}
            onError={(error) => handleSaveError('Location', error)}
          />

          <Separator />

          <PhotosSection
            profile={profile}
            onSuccess={() => handleSaveSuccess('Photos')}
            onError={(error) => handleSaveError('Photos', error)}
          />

          <Separator />

          <MusicPreferencesSection
            profile={profile}
            onSuccess={() => handleSaveSuccess('Music Preferences')}
            onError={(error) => handleSaveError('Music Preferences', error)}
          />

          <Separator />

          <LifestyleSection
            profile={profile}
            onSuccess={() => handleSaveSuccess('Lifestyle')}
            onError={(error) => handleSaveError('Lifestyle', error)}
          />

          <Separator />

          <PersonalitySection
            profile={profile}
            onSuccess={() => handleSaveSuccess('Personality')}
            onError={(error) => handleSaveError('Personality', error)}
          />

          <Separator />

          <DatingPreferencesSection
            profile={profile}
            onSuccess={() => handleSaveSuccess('Dating Preferences')}
            onError={(error) => handleSaveError('Dating Preferences', error)}
          />

          <Separator />

          <div id="privacy">
            <PrivacySettingsSection
              profile={profile}
              onSuccess={() => handleSaveSuccess('Privacy Settings')}
              onError={(error) => handleSaveError('Privacy Settings', error)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
