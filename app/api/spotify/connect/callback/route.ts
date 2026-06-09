import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectSpotify } from '@/app/serverActions/auth';

/**
 * Handles Spotify OAuth callback for connecting Spotify to email account
 * GET /api/spotify/connect/callback?code=...
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.redirect(
      new URL('/profile/settings?error=not_authenticated', process.env.NEXTAUTH_URL!)
    );
  }

  if ((session as any).authProvider === 'SPOTIFY') {
    return NextResponse.redirect(
      new URL('/profile/settings?error=already_spotify', process.env.NEXTAUTH_URL!)
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // User denied authorization
  if (error === 'access_denied') {
    return NextResponse.redirect(
      new URL('/profile/settings?error=spotify_denied', process.env.NEXTAUTH_URL!)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/profile/settings?error=no_code', process.env.NEXTAUTH_URL!)
    );
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/spotify/connect/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Spotify token exchange failed:', errorData);
      return NextResponse.redirect(
        new URL('/profile/settings?error=token_exchange_failed', process.env.NEXTAUTH_URL!)
      );
    }

    const tokens = await tokenResponse.json();

    // Get Spotify user profile to get the Spotify ID
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      console.error('Failed to fetch Spotify profile');
      return NextResponse.redirect(
        new URL('/profile/settings?error=profile_fetch_failed', process.env.NEXTAUTH_URL!)
      );
    }

    const profile = await profileResponse.json();

    // Call our backend to connect the Spotify account
    const result = await connectSpotify({
      spotifyId: profile.id,
      spotifyAccessToken: tokens.access_token,
      spotifyRefreshToken: tokens.refresh_token,
      spotifyTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
    });

    if (!result.ok) {
      console.error('Backend connection failed:', result.error);
      return NextResponse.redirect(
        new URL(
          `/profile/settings?error=backend_failed&message=${encodeURIComponent(result.error.message)}`,
          process.env.NEXTAUTH_URL!
        )
      );
    }

    // Success! Redirect to settings with success message
    return NextResponse.redirect(
      new URL('/profile/settings?success=spotify_connected', process.env.NEXTAUTH_URL!)
    );
  } catch (error: any) {
    console.error('Spotify connection error:', error);
    return NextResponse.redirect(
      new URL(
        `/profile/settings?error=unknown&message=${encodeURIComponent(error.message)}`,
        process.env.NEXTAUTH_URL!
      )
    );
  }
}
