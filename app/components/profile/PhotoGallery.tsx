import { Badge } from '@/components/ui/badge';
import { PHOTO_GRID_CONFIG } from '@/lib/profileConstants';

export interface Photo {
  id?: string;
  imageUrl: string;
  caption?: string | null;
  isPrimary: boolean;
  displayOrder: number;
}

interface PhotoGalleryProps {
  photos: Photo[];
  className?: string;
}

/**
 * Reusable photo gallery component with hover effects and primary badge
 */
export function PhotoGallery({ photos, className = '' }: PhotoGalleryProps) {
  if (!photos || photos.length === 0) {
    return null;
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${className}`}>
      {photos.map((photo, index) => (
        <div key={photo.id || index} className="relative group aspect-3/4 overflow-hidden rounded-2xl">
          <img
            src={photo.imageUrl}
            alt={photo.caption || `Photo ${index + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {photo.isPrimary && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-background/90 backdrop-blur-sm border-none">Primary</Badge>
            </div>
          )}
          {photo.caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-sm">{photo.caption}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface PrimaryPhotoProps {
  photoUrl: string | undefined;
  name: string;
  age: number;
  className?: string;
}

/**
 * Primary profile photo with age badge
 */
export function PrimaryPhoto({ photoUrl, name, age, className = '' }: PrimaryPhotoProps) {
  return (
    <div className={`relative ${className}`}>
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="w-full aspect-square object-cover rounded-2xl" />
      ) : (
        <div className="w-full aspect-square bg-muted rounded-2xl flex items-center justify-center">
          <span className="text-6xl font-bold text-muted-foreground">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div className="absolute top-4 right-4">
        <Badge className="bg-primary/90 backdrop-blur-sm">{age} years old</Badge>
      </div>
    </div>
  );
}
