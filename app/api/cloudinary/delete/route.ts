import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user?.id;
  if (typeof userId !== 'string' || userId.length === 0) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { publicId } = await request.json();

    // Trailing slash prevents prefix-collision IDOR (e.g. user '1' matching '10/...').
    const userPrefix = `dating-app/profiles/${userId}/`;
    if (!publicId || typeof publicId !== 'string' || !publicId.startsWith(userPrefix)) {
      console.error('Cloudinary delete forbidden:', { userId, publicId });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await cloudinary.uploader.destroy(publicId);

    return NextResponse.json({ success: result.result === 'ok' });
  } catch (error) {
    console.error('Delete error:', { userId, error });
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
