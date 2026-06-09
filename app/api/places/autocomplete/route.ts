import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const input = searchParams.get('input');
  const country = searchParams.get('country');

  if (!input) {
    return NextResponse.json({ predictions: [] });
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.append('input', input);
    url.searchParams.append('types', '(cities)');
    url.searchParams.append('key', process.env.GOOGLE_MAPS_API_KEY!);

    if (country) {
      url.searchParams.append('components', `country:${country}`);
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    return NextResponse.json({
      predictions: data.predictions?.map((p: any) => p.description) || [],
    });
  } catch (error) {
    console.error('Places API error:', error);
    return NextResponse.json({ predictions: [] });
  }
}
