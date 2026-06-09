import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Initiates Spotify OAuth connection flow for email users
 * GET /api/spotify/connect
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if ((session as any).authProvider === 'SPOTIFY') {
    return NextResponse.json({ error: 'Already using Spotify authentication' }, { status: 400 });
  }

  const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
  const callbackUrl = `${process.env.NEXTAUTH_URL}/api/spotify/connect/callback`;

  if (!spotifyClientId) {
    return NextResponse.json({ error: 'Spotify not configured' }, { status: 500 });
  }

  // Build Spotify authorization URL
  const scopes = [
    'user-read-email',
    'user-read-private',
    'user-top-read',
    'user-read-recently-played',
  ];

  const params = new URLSearchParams({
    client_id: spotifyClientId,
    response_type: 'code',
    redirect_uri: callbackUrl,
    scope: scopes.join(' '),
    show_dialog: 'true', // Force user to approve connection
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  // Redirect to Spotify authorization
  return NextResponse.redirect(authUrl);
}
