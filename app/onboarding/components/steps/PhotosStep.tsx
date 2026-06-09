'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { PhotosRequestDto, PhotoUploadRequestDto } from '@/types/onboarding';
import { savePhotos } from '@/app/serverActions/onboarding';
import { uploadToCloudinary, validateImageFile, deleteFromCloudinary } from '@/lib/cloudinary';
import { Form, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Loader2, Plus, Trash2 } from 'lucide-react';
import SectionHeader from '../SectionHeader';

// Local-only shape: tracks Cloudinary publicId alongside the wire DTO so deletes can target the
// full `dating-app/profiles/{userId}/...` path the delete route requires. Stripped before submit.
type LocalPhoto = PhotoUploadRequestDto & { publicId?: string };

// Cloudinary URLs look like: .../upload/v123456/dating-app/profiles/<userId>/<file>.<ext>
// publicId is the path between `/upload/(v\d+/)?` and the final extension.
function publicIdFromUrl(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^./]+$/);
  return match ? match[1] : null;
}

const schema = z.object({
  photos: z
    .array(
      z.object({
        imageUrl: z.string().url(),
        displayOrder: z.number(),
        isPrimary: z.boolean(),
        caption: z.string().optional(),
      })
    )
    .min(1, 'Upload at least 1 photo')
    .max(6, 'Maximum 6 photos allowed'),
});

type Props = {
  data?: PhotosRequestDto;
  onNext: (data: PhotosRequestDto) => void;
  onBack: () => void;
};

export default function PhotosStep({ data, onNext, onBack }: Props) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<LocalPhoto[]>(data?.photos || []);

  const form = useForm<PhotosRequestDto>({
    resolver: zodResolver(schema),
    defaultValues: data || { photos: [] },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 6) {
      setError('Maximum 6 photos allowed');
      return;
    }

    setUploading(true);
    setError(null);

    const newPhotos: LocalPhoto[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validationError = validateImageFile(file);

      if (validationError) {
        setError(validationError);
        continue;
      }

      const result = await uploadToCloudinary(file, userId!);

      if (result.ok) {
        newPhotos.push({
          imageUrl: result.url,
          publicId: result.publicId,
          displayOrder: photos.length + newPhotos.length,
          isPrimary: photos.length === 0 && newPhotos.length === 0,
        });
      } else {
        setError(result.error);
      }
    }

    const updatedPhotos = [...photos, ...newPhotos];
    setPhotos(updatedPhotos);
    form.setValue('photos', updatedPhotos);
    setUploading(false);
  };

  const handleRemovePhoto = async (index: number) => {
    const photo = photos[index];

    if (photo.imageUrl.includes('cloudinary')) {
      const publicId = photo.publicId ?? publicIdFromUrl(photo.imageUrl);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    const updatedPhotos = photos.filter((_, i) => i !== index).map((p, i) => ({
      ...p,
      displayOrder: i,
      isPrimary: i === 0,
    }));

    setPhotos(updatedPhotos);
    form.setValue('photos', updatedPhotos);
  };

  const handleSetPrimary = (index: number) => {
    const updatedPhotos = photos.map((p, i) => ({
      ...p,
      isPrimary: i === index,
    }));

    setPhotos(updatedPhotos);
    form.setValue('photos', updatedPhotos);
  };

  const onSubmit = async (formData: PhotosRequestDto) => {
    setIsLoading(true);
    setError(null);

    const result = await savePhotos(formData);

    if (result.ok) {
      onNext(formData);
    } else {
      setError(result.error.message);
    }

    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-8">
      <SectionHeader
        icon={Camera}
        roman="III"
        eyebrow="act three · the curtain rises"
        title="Now show us your"
        accent="face."
        description="Your first frame is the lead — add up to six. A clear face in the lead frame gets ~40% more views."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="photos"
            render={() => (
              <FormItem>
                <div className="grid grid-cols-2 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative aspect-3/4">
                      <img
                        src={photo.imageUrl}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover rounded-3xl"
                      />

                      {photo.isPrimary && (
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-background/90 text-foreground border-none backdrop-blur-sm">
                            Primary
                          </Badge>
                        </div>
                      )}

                      {/* Action buttons — always visible for touch accessibility */}
                      <div className="absolute top-2 right-2 flex gap-1.5">
                        {!photo.isPrimary && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-8 rounded-full bg-background/90 backdrop-blur-sm text-xs shadow-sm"
                            onClick={() => handleSetPrimary(index)}
                          >
                            Set Primary
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8 rounded-full shadow-sm"
                          onClick={() => handleRemovePhoto(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center border border-border">
                        <span className="text-xs font-medium">{index + 1}</span>
                      </div>
                    </div>
                  ))}

                  {Array.from({ length: Math.min(6 - photos.length, 6) }).map((_, index) => (
                    <label
                      key={`empty-${index}`}
                      className="aspect-3/4 border-2 border-dashed border-border/50 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-secondary hover:bg-secondary/5 transition-all bg-muted/20"
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={uploading}
                      />
                      <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center">
                        <Plus className="w-8 h-8 text-secondary" />
                      </div>
                      {uploading && index === 0 && (
                        <p className="text-xs text-muted-foreground mt-3">Uploading...</p>
                      )}
                    </label>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground mt-2">JPEG, PNG, WebP, HEIC · max 5MB each</p>
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
            <Button
              type="submit"
              className="flex-1 rounded-full v-cta-gold"
              disabled={isLoading || uploading || photos.length < 1}
            >
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Continue'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
