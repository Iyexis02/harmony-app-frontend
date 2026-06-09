'use server';

import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { apiRequest, authenticatedApiRequest } from '@/lib/api';
import type {
  ApiResult,
  AuthResponseDto,
  ConnectSpotifyRequestDto,
  EmailVerificationRequestDto,
  ForgotPasswordRequestDto,
  LoginRequestDto,
  RegisterRequestDto,
  ResetPasswordRequestDto,
} from '@/types/auth';

export async function registerWithEmail(data: RegisterRequestDto): Promise<ApiResult<AuthResponseDto>> {
  return apiRequest<AuthResponseDto>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function loginWithEmail(data: LoginRequestDto): Promise<ApiResult<AuthResponseDto>> {
  return apiRequest<AuthResponseDto>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function verifyEmail(data: EmailVerificationRequestDto): Promise<ApiResult<{ message: string }>> {
  return apiRequest<{ message: string }>('/api/v1/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function resendVerificationEmail(data: ForgotPasswordRequestDto): Promise<ApiResult<{ message: string }>> {
  return apiRequest<{ message: string }>('/api/v1/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function forgotPassword(data: ForgotPasswordRequestDto): Promise<ApiResult<{ message: string }>> {
  return apiRequest<{ message: string }>('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function resetPassword(data: ResetPasswordRequestDto): Promise<ApiResult<{ message: string }>> {
  return apiRequest<{ message: string }>('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function connectSpotify(data: ConnectSpotifyRequestDto): Promise<ApiResult<AuthResponseDto>> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { ok: false, error: { status: 401, message: 'Not authenticated' } };
  }
  return authenticatedApiRequest<AuthResponseDto>('/api/v1/auth/connect-spotify', session.accessToken, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
