'use client';

import { Camera, Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { savePhotos } from '@/app/serverActions/onboarding';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { deleteFromCloudinary, uploadToCloudinary, validateImageFile } from '@/lib/cloudinary';
import type { PhotoResponseDto, PhotoUploadRequestDto } from '@/types/onboarding';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPhotos: PhotoResponseDto[];
  userId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
};

export function PhotoManagementModal({ open, onOpenChange, initialPhotos, userId, onSuccess, onError }: Props) {
  const [photos, setPhotos] = useState<PhotoUploadRequestDto[]>(
    initialPhotos.map((p) => ({
      imageUrl: p.imageUrl,
      displayOrder: p.displayOrder,
      isPrimary: p.isPrimary,
      caption: p.caption,
    }))
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 6) {
      setLocalError('Maximum 6 photos allowed');
      return;
    }

    setUploading(true);
    setLocalError(null);

    const newPhotos: PhotoUploadRequestDto[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validationError = validateImageFile(file);

      if (validationError) {
        setLocalError(validationError);
        continue;
      }

      const result = await uploadToCloudinary(file, userId);

      if (result.ok) {
        newPhotos.push({
          imageUrl: result.url,
          displayOrder: photos.length + newPhotos.length,
          isPrimary: photos.length === 0 && newPhotos.length === 0,
        });
      } else {
        setLocalError(result.error);
      }
    }

    const updatedPhotos = [...photos, ...newPhotos];
    setPhotos(updatedPhotos);
    setUploading(false);

    // Reset file input
    event.target.value = '';
  };

  const handleRemovePhoto = async (index: number) => {
    const photo = photos[index];

    // Extract public ID from Cloudinary URL and delete
    if (photo.imageUrl.includes('cloudinary')) {
      const publicId = photo.imageUrl.split('/').slice(-1)[0].split('.')[0];
      await deleteFromCloudinary(publicId);
    }

    const updatedPhotos = photos
      .filter((_, i) => i !== index)
      .map((p, i) => ({
        ...p,
        displayOrder: i,
        isPrimary: i === 0,
      }));

    setPhotos(updatedPhotos);
  };

  const handleSetPrimary = (index: number) => {
    const updatedPhotos = photos.map((p, i) => ({
      ...p,
      isPrimary: i === index,
    }));

    setPhotos(updatedPhotos);
  };

  const handleSave = async () => {
    if (photos.length < 1) {
      setLocalError('Upload at least 1 photo');
      return;
    }

    if (photos.length > 6) {
      setLocalError('Maximum 6 photos allowed');
      return;
    }

    setSaving(true);
    setLocalError(null);

    const result = await savePhotos({ photos });

    if (result.ok) {
      onSuccess();
      onOpenChange(false);
    } else {
      onError(result.error.message);
    }

    setSaving(false);
  };

  const handleCancel = () => {
    // Reset to initial state
    setPhotos(
      initialPhotos.map((p) => ({
        imageUrl: p.imageUrl,
        displayOrder: p.displayOrder,
        isPrimary: p.isPrimary,
        caption: p.caption,
      }))
    );
    setLocalError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Manage Photos
          </DialogTitle>
          <DialogDescription>Add, remove, or reorder your photos. Select one as primary.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Photo Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo, index) => (
              <div key={index} className="relative group aspect-3/4">
                <img
                  src={photo.imageUrl}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />

                {photo.isPrimary && (
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-primary text-primary-foreground">Primary</Badge>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  {!photo.isPrimary && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => handleSetPrimary(index)}>
                      Set Primary
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="rounded-full"
                    onClick={() => handleRemovePhoto(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center border border-border">
                  <span className="text-xs font-medium">{index + 1}</span>
                </div>
              </div>
            ))}

            {/* Upload slots */}
            {Array.from({ length: Math.min(6 - photos.length, 6) }).map((_, index) => (
              <label
                key={`empty-${index}`}
                className="aspect-3/4 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {uploading && index === 0 ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  ) : (
                    <Plus className="w-6 h-6 text-primary" />
                  )}
                </div>
                {uploading && index === 0 && <p className="text-xs text-muted-foreground mt-2">Uploading...</p>}
              </label>
            ))}
          </div>

          {/* Info */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Upload 1-6 photos (JPEG, PNG, WebP, or HEIC)</p>
            <p>• Maximum file size: 5MB per photo</p>
            <p>• One photo must be marked as primary</p>
            <p>• Hover over photos to set primary or delete</p>
          </div>

          {/* Error Message */}
          {localError && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg text-sm">
              {localError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving || uploading} className="flex-1">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || uploading || photos.length < 1}
              className="flex-1">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
