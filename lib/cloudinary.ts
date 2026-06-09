import { logError } from '@/lib/logger';

type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
};

type UploadResult = { ok: true; url: string; publicId: string } | { ok: false; error: string };

export async function uploadToCloudinary(file: File, userId: string, folder?: string): Promise<UploadResult> {
  const uploadFolder = folder ?? `dating-app/profiles/${userId}`;
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
    formData.append('folder', uploadFolder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result: CloudinaryUploadResult = await response.json();

    return {
      ok: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return {
      ok: false,
      error: error?.message || 'Upload failed',
    };
  }
}

export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId }),
    });

    return response.ok;
  } catch (error) {
    logError('cloudinary:delete', error, { publicId });
    return false;
  }
}

export function getOptimizedImageUrl(url: string, width: number = 400, height: number = 400): string {
  if (!url.includes('cloudinary')) return url;

  return url.replace('/upload/', `/upload/c_fill,w_${width},h_${height},g_auto,q_auto:good/`);
}

export function validateImageFile(file: File): string | null {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Only JPEG, PNG, WebP, and HEIC images are allowed';
  }

  if (file.size > MAX_SIZE) {
    return 'Image must be smaller than 5MB';
  }

  return null;
}
