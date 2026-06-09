'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useState } from 'react';

import { PrivacySettingsModal } from '@/app/edit-profile/components/PrivacySettingsModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { CompleteProfileResponseDto } from '@/types/onboarding';

type Props = {
  profile: CompleteProfileResponseDto;
  onSuccess: () => void;
  onError: (error: string) => void;
};

export function PrivacySettingsSection({ profile, onSuccess, onError }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <AnimatePresence mode="wait">
      <motion.div key="privacy" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy Settings
          </h2>
          <Button variant="outline" onClick={() => setIsModalOpen(true)}>
            Edit
          </Button>
        </div>

        {profile.privacySettings ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Profile Public</p>
              <p className="text-foreground font-medium">{profile.privacySettings.isProfilePublic ? 'Yes' : 'No'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Show Age</p>
              <p className="text-foreground font-medium">{profile.privacySettings.showAge ? 'Yes' : 'No'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Show Distance</p>
              <p className="text-foreground font-medium">{profile.privacySettings.showDistance ? 'Yes' : 'No'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Show Last Active</p>
              <p className="text-foreground font-medium">{profile.privacySettings.showLastActive ? 'Yes' : 'No'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Discoverable</p>
              <p className="text-foreground font-medium">{profile.privacySettings.discoverable ? 'Yes' : 'No'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Show Spotify Profile</p>
              <p className="text-foreground font-medium">{profile.privacySettings.showSpotifyProfile ? 'Yes' : 'No'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Show Music Stats</p>
              <p className="text-foreground font-medium">{profile.privacySettings.showMusicStats ? 'Yes' : 'No'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Read Receipts</p>
              <p className="text-foreground font-medium">{profile.privacySettings.readReceipts ? 'Yes' : 'No'}</p>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">No privacy settings configured</p>
        )}
      </Card>

      <PrivacySettingsModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialSettings={profile.privacySettings}
        onSuccess={onSuccess}
        onError={onError}
      />
      </motion.div>
    </AnimatePresence>
  );
}
