// types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    spotifyAccessToken?: string;
    error?: string;
    emailVerified?: boolean;
    authProvider?: 'EMAIL' | 'SPOTIFY';
    registrationStage?: string;
    /** Unix epoch in milliseconds when the backend JWT expires. EMAIL users only. */
    appJwtExpires?: number;
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    appJwt?: string;
    appJwtExpires?: number;
    spotifyAccessToken?: string;
    spotifyRefreshToken?: string;
    spotifyTokenExpires?: number;
    authProvider?: 'EMAIL' | 'SPOTIFY';
    emailVerified?: boolean;
    registrationStage?: string;
    error?: string;
  }
}