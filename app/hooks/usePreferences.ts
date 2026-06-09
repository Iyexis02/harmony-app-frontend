import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { authenticatedApiRequest, isEmailVerificationError } from '@/lib/api';
import { ErrorCode } from '@/types/error';
import type {
  GenrePreferenceDto,
  UserGenrePreferencesResponseDto,
  SyncSpotifyResponseDto,
} from '@/types/phase2';

export function usePreferences() {
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState<GenrePreferenceDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);

  const token = (session as any)?.accessToken as string | undefined;

  const fetchPreferences = useCallback(async (limit: number = 20) => {
    if (!token) {
      setError('No authentication token available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await authenticatedApiRequest<UserGenrePreferencesResponseDto>(
        `/api/v1/preferences/genres?limit=${limit}`,
        token
      );

      if (!result.ok) {
        if (isEmailVerificationError(result.error)) {
          toast.error('Please verify your email to continue');
          setEmailVerificationRequired(true);
          return;
        }
        throw new Error(result.error.message);
      }

      setPreferences(result.data.preferences || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch preferences';
      setError(errorMessage);
      console.error('Failed to fetch preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const addPreference = useCallback(
    async (genreName: string, weight: number = 1.0) => {
      if (!token) {
        setError('No authentication token available');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await authenticatedApiRequest<void>(
          '/api/v1/preferences/genres',
          token,
          {
            method: 'POST',
            body: JSON.stringify({ genreName, weight }),
          }
        );

        if (!result.ok) {
          if (isEmailVerificationError(result.error)) {
            toast.error('Please verify your email to continue');
            setEmailVerificationRequired(true);
            return false;
          }
          throw new Error(result.error.message);
        }

        await fetchPreferences();
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add preference';
        setError(errorMessage);
        console.error('Failed to add preference:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [token, fetchPreferences]
  );

  const removePreference = useCallback(
    async (genreName: string) => {
      if (!token) {
        setError('No authentication token available');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await authenticatedApiRequest<void>(
          `/api/v1/preferences/genres/${genreName}`,
          token,
          { method: 'DELETE' }
        );

        if (!result.ok) {
          if (isEmailVerificationError(result.error)) {
            toast.error('Please verify your email to continue');
            setEmailVerificationRequired(true);
            return false;
          }
          throw new Error(result.error.message);
        }

        await fetchPreferences();
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to remove preference';
        setError(errorMessage);
        console.error('Failed to remove preference:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [token, fetchPreferences]
  );

  const syncSpotify = useCallback(
    async (quick: boolean = false) => {
      if (!token) {
        setError('No authentication token available');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await authenticatedApiRequest<SyncSpotifyResponseDto>(
          `/api/v1/preferences/genres/sync?quick=${quick}`,
          token,
          { method: 'POST' }
        );

        if (!result.ok) {
          if (isEmailVerificationError(result.error)) {
            toast.error('Please verify your email to continue');
            setEmailVerificationRequired(true);
            return false;
          }
          if (result.error.code === ErrorCode.SPOTIFY_TOKEN_EXPIRED) {
            toast.error('Your Spotify connection has expired.', {
              action: {
                label: 'Reconnect',
                onClick: () => { window.location.href = '/api/spotify/connect'; },
              },
            });
            return false;
          }
          if (result.error.code === ErrorCode.SPOTIFY_UNAVAILABLE) {
            toast.error('Spotify is temporarily unavailable. Try again later.');
            return false;
          }
          throw new Error(result.error.message);
        }

        await fetchPreferences();
        return result.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to sync with Spotify';
        setError(errorMessage);
        console.error('Failed to sync with Spotify:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [token, fetchPreferences]
  );

  const clearSpotifyPreferences = useCallback(async () => {
    if (!token) {
      setError('No authentication token available');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await authenticatedApiRequest<void>(
        '/api/v1/preferences/genres/spotify',
        token,
        { method: 'DELETE' }
      );

      if (!result.ok) {
        if (isEmailVerificationError(result.error)) {
          toast.error('Please verify your email to continue');
          setEmailVerificationRequired(true);
          return false;
        }
        throw new Error(result.error.message);
      }

      await fetchPreferences();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear Spotify preferences';
      setError(errorMessage);
      console.error('Failed to clear Spotify preferences:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, fetchPreferences]);

  // Auto-fetch preferences when token is available
  useEffect(() => {
    if (token) {
      fetchPreferences();
    }
  }, [token, fetchPreferences]);

  return {
    preferences,
    loading,
    error,
    emailVerificationRequired,
    fetchPreferences,
    addPreference,
    removePreference,
    syncSpotify,
    clearSpotifyPreferences,
  };
}
