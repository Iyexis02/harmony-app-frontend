// Authentication DTOs matching backend API

export interface RegisterRequestDto {
  email: string;
  name: string;
  password: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface AuthResponseDto {
  token: string;
  userId: string;
  email: string;
  name: string;
  registrationStage: string;
  emailVerified: boolean;
  authProvider: 'EMAIL' | 'SPOTIFY';
}

export interface EmailVerificationRequestDto {
  token: string;
}

export interface ForgotPasswordRequestDto {
  email: string;
}

export interface ResetPasswordRequestDto {
  token: string;
  newPassword: string;
}

export interface ConnectSpotifyRequestDto {
  spotifyId: string;
  spotifyAccessToken: string;
  spotifyRefreshToken: string;
  spotifyTokenExpiresAt: number;
}

export interface ApiResponse<T = void> {
  ok: true;
  data: T;
  warnings?: string[];
}

export interface ApiError {
  ok: false;
  error: {
    status: number;
    message: string;
    code?: string;
    fields?: Record<string, string> | null;
    retryAfter?: number;
    correlationId?: string;
  };
}

export type ApiResult<T = void> = ApiResponse<T> | ApiError;
