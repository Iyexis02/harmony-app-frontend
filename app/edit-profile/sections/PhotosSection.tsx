'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

import { PhotoManagementModal } from '@/app/edit-profile/components/PhotoManagementModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { CompleteProfileResponseDto } from '@/types/onboarding';

type Props = {
  profile: CompleteProfileResponseDto;
  onSuccess: () => void;
  onError: (error: string) => void;
};

export function PhotosSection({ profile, onSuccess, onError }: Props) {
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <AnimatePresence mode="wait">
      <motion.div key="photos" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Photos
          </h2>
          <Button variant="outline" onClick={() => setIsModalOpen(true)}>
            Manage Photos
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {profile.photos && profile.photos.length > 0 ? (
            profile.photos.map((photo) => (
              <div key={photo.id} className="relative aspect-3/4 rounded-lg overflow-hidden">
                <img src={photo.imageUrl} alt={photo.caption || 'Profile photo'} className="w-full h-full object-cover" />
                {photo.isPrimary && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                    Primary
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-muted-foreground">No photos uploaded yet</div>
          )}
        </div>

        <p className="text-sm text-muted-foreground mt-4">
          Click "Manage Photos" to add, remove, reorder, or set a primary photo.
        </p>
      </Card>

      <PhotoManagementModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialPhotos={profile.photos || []}
        userId={session?.user?.id ?? ''}
        onSuccess={onSuccess}
        onError={onError}
      />
      </motion.div>
    </AnimatePresence>
  );
}
