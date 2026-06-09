// app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import SpotifyProvider from 'next-auth/providers/spotify';

import { loginWithEmail } from '@/app/serverActions/auth';
import { SpotifyUserDto } from '@/types';

type TokenStore = {
  spotifyId: string | undefined;
  email: string | undefined;
  name: string | null | undefined;
  spotifyAccessToken: string | undefined;
  spotifyRefreshToken: string | undefined;
  spotifyTokenExpiresAt: number | undefined;
  imageUrl?: string | null;
};

/**
 * Decodes the payload of a JWT without verifying its signature.
 * Used only to read the `exp` claim so we can cache the expiry time.
 */
function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function storeTokens({
  spotifyId,
  email,
  name,
  spotifyAccessToken,
  spotifyRefreshToken,
  spotifyTokenExpiresAt,
  imageUrl,
}: TokenStore): Promise<SpotifyUserDto> {
  // FIX: body should not be inside headers
  const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/auth/spotify-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      spotifyId,
      email,
      name,
      spotifyAccessToken,
      spotifyRefreshToken,
      spotifyTokenExpiresAt,
      imageUrl,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to store tokens');
  }

  return response.json();
}

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
async function refreshAccessToken(token: any) {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.spotifyRefreshToken, // FIX: use correct token name
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      spotifyAccessToken: refreshedTokens.access_token,
      spotifyTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      spotifyRefreshToken: refreshedTokens.refresh_token ?? token.spotifyRefreshToken,
    };
  } catch (error) {
    console.error('Error refreshing access token', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

/**
 * Serializes concurrent Spotify token refreshes.
 * Spotify refresh tokens are single-use and rotate on each exchange — only
 * the first caller should hit Spotify's /api/token. Subsequent concurrent
 * callers await the same promise and reuse its result.
 * The timeout guard ensures a hung refresh never permanently blocks sessions.
 */
const refreshPromises = new Map<string, Promise<any>>();
const REFRESH_LOCK_TIMEOUT_MS = 10_000;

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: '/login',
  },
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID as string,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: 'user-read-email user-read-private user-top-read user-read-recently-played',
        },
      },
    }),
    CredentialsProvider({
      id: 'email-password',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const result = await loginWithEmail({
          email: credentials.email,
          password: credentials.password,
        });

        if (!result.ok) {
          throw new Error(result.error.message || 'Invalid credentials');
        }

        const { token, userId, email, name, emailVerified, authProvider, registrationStage } = result.data;

        return {
          id: userId,
          email,
          name,
          appJwt: token,
          emailVerified,
          authProvider,
          registrationStage,
        } as any;
      },
    }),
  ],
  callbacks: {
    async signIn() {
      return true;
    },
    async jwt({ token, account, user, profile, trigger, session }) {
      // Session update triggered by client-side update() call
      if (trigger === 'update' && session?.registrationStage) {
        token.registrationStage = session.registrationStage;
        return token;
      }

      // Initial sign in
      if (account && user) {
        // Handle Email/Password authentication
        if (account.provider === 'email-password') {
          token.userId = user.id;
          token.appJwt = (user as any).appJwt;
          token.authProvider = (user as any).authProvider;
          token.emailVerified = (user as any).emailVerified;
          token.registrationStage = (user as any).registrationStage;

          // Cache the backend JWT expiry so the client can warn before it lapses.
          const payload = decodeJwtPayload((user as any).appJwt ?? '');
          if (typeof payload?.exp === 'number') {
            token.appJwtExpires = payload.exp * 1000; // convert to milliseconds
          }

          return token;
        }

        // Handle Spotify OAuth
        if (account.provider === 'spotify' && profile) {

          token.spotifyAccessToken = account.access_token;
          token.spotifyRefreshToken = account.refresh_token;
          token.spotifyTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;
          token.authProvider = 'SPOTIFY';

          try {
            const spotifyUser = await storeTokens({
              spotifyId: account?.providerAccountId,
              email: profile.email,
              name: user?.name,
              spotifyAccessToken: account.access_token,
              spotifyRefreshToken: account.refresh_token,
              spotifyTokenExpiresAt: account.expires_at ? account.expires_at * 1000 : 0,
              imageUrl: user?.image,
            });

            token.appJwt = spotifyUser.token;
            token.userId = spotifyUser.userId;
            token.emailVerified = spotifyUser.emailVerified;
            token.registrationStage = spotifyUser.registrationStage;
          } catch (error) {
            console.error('Error storing tokens:', error);
          }

          return token;
        }
      }

      // For email/password users, no token refresh needed
      if (token.authProvider === 'EMAIL') {
        return token;
      }

      // For Spotify users, check if token needs refresh
      if (token.spotifyTokenExpires && Date.now() < (token.spotifyTokenExpires as number)) {
        return token;
      }

      // Spotify access token has expired — serialize to prevent concurrent
      // callers from each consuming the single-use Spotify refresh token.
      // Keyed per-user so one user's refresh cannot leak rotated tokens into
      // another user's JWT.
      const refreshKey =
        (token.userId as string | undefined) ??
        (token.sub as string | undefined) ??
        (token.spotifyId as string | undefined) ??
        (token.spotifyRefreshToken as string | undefined);

      if (!refreshKey) {
        return refreshAccessToken(token);
      }

      let pending = refreshPromises.get(refreshKey);
      if (!pending) {
        pending = Promise.race([
          refreshAccessToken(token),
          new Promise<any>((resolve) =>
            setTimeout(() => {
              resolve({ ...token, error: 'RefreshAccessTokenError' });
            }, REFRESH_LOCK_TIMEOUT_MS)
          ),
        ]).finally(() => {
          refreshPromises.delete(refreshKey);
        });
        refreshPromises.set(refreshKey, pending);
      }

      return pending;
    },
    async session({ session, token }) {
      // Expose YOUR JWT to the client (not Spotify token!)
      session.accessToken = token.appJwt as string;
      session.spotifyAccessToken = token.spotifyAccessToken as string | undefined;
      session.user.id = token.userId as string;
      (session as any).emailVerified = token.emailVerified as boolean;
      (session as any).authProvider = token.authProvider as string;
      (session as any).registrationStage = token.registrationStage as string;

      // Expose backend JWT expiry for email users (drives useSessionHealth warnings).
      if (token.appJwtExpires) {
        session.appJwtExpires = token.appJwtExpires;
      }

      // Optional: Add error flag to session if token refresh failed
      if (token.error) {
        session.error = token.error as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // If url is relative, prepend baseUrl
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // If url starts with baseUrl, use it
      if (url.startsWith(baseUrl)) return url;
      // Default to baseUrl (home page)
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
