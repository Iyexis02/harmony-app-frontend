/**
 * Batch G — Spotify Error Code Handling
 *
 * Verifies that SPOTIFY_TOKEN_EXPIRED and SPOTIFY_UNAVAILABLE produce
 * the correct UX (reconnect toast / retry toast) and that SPOTIFY_TOKEN_EXPIRED
 * never triggers signOut().
 *
 * Run with: npx vitest run __tests__/batch-g-spotify-error-codes.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// --------------------------------------------------------------------------
// Mocks — must be declared before any import that uses them
// --------------------------------------------------------------------------

const mockToastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: mockToastError } }));

const mockSignOut = vi.fn();
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { accessToken: 'valid-jwt' } }),
  signOut: mockSignOut,
}));

const mockAuthenticatedApiRequest = vi.fn();
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    authenticatedApiRequest: mockAuthenticatedApiRequest,
  };
});

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function spotifyExpiredResponse() {
  return {
    ok: false,
    error: { status: 401, code: 'SPOTIFY_TOKEN_EXPIRED', message: 'Spotify token expired' },
  };
}

function spotifyUnavailableResponse() {
  return {
    ok: false,
    error: { status: 502, code: 'SPOTIFY_UNAVAILABLE', message: 'Spotify service unavailable' },
  };
}

function expiredAppJwtResponse() {
  return {
    ok: false,
    error: { status: 401, code: 'UNAUTHORIZED', message: 'Session expired' },
  };
}

// --------------------------------------------------------------------------
// isSpotifyTokenExpiredError helper
// --------------------------------------------------------------------------

describe('isSpotifyTokenExpiredError (lib/api)', () => {
  it('returns true for 401 + SPOTIFY_TOKEN_EXPIRED', async () => {
    const { isSpotifyTokenExpiredError } = await import('@/lib/api');
    expect(
      isSpotifyTokenExpiredError({ status: 401, code: 'SPOTIFY_TOKEN_EXPIRED', message: '' })
    ).toBe(true);
  });

  it('returns false for 401 + UNAUTHORIZED (expired app JWT)', async () => {
    const { isSpotifyTokenExpiredError } = await import('@/lib/api');
    expect(
      isSpotifyTokenExpiredError({ status: 401, code: 'UNAUTHORIZED', message: '' })
    ).toBe(false);
  });

  it('returns false for 401 with no code', async () => {
    const { isSpotifyTokenExpiredError } = await import('@/lib/api');
    expect(isSpotifyTokenExpiredError({ status: 401, message: '' })).toBe(false);
  });

  it('returns false for 502 + SPOTIFY_UNAVAILABLE (wrong status)', async () => {
    const { isSpotifyTokenExpiredError } = await import('@/lib/api');
    expect(
      isSpotifyTokenExpiredError({ status: 502, code: 'SPOTIFY_TOKEN_EXPIRED', message: '' })
    ).toBe(false);
  });
});

// --------------------------------------------------------------------------
// usePreferences — syncSpotify
// --------------------------------------------------------------------------

describe('usePreferences.syncSpotify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: fetchPreferences succeeds (called in useEffect on mount)
    mockAuthenticatedApiRequest.mockResolvedValue({
      ok: true,
      data: { preferences: [] },
    });
  });

  it('shows reconnect toast (not signOut) on SPOTIFY_TOKEN_EXPIRED', async () => {
    const { usePreferences } = await import('@/app/hooks/usePreferences');
    const { result } = renderHook(() => usePreferences());

    // Override for the sync call specifically
    // Route by URL so the result is independent of mount-effect timing: only the
    // /sync call fails; the mount and post-sync preference fetches succeed.
    mockAuthenticatedApiRequest.mockImplementation((path: string) =>
      Promise.resolve(
        path.includes('/sync') ? spotifyExpiredResponse() : { ok: true, data: { preferences: [] } },
      ),
    );

    await act(async () => {
      await result.current.syncSpotify();
    });

    expect(mockToastError).toHaveBeenCalledWith(
      'Your Spotify connection has expired.',
      expect.objectContaining({ action: expect.objectContaining({ label: 'Reconnect' }) })
    );
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('shows unavailable toast on SPOTIFY_UNAVAILABLE', async () => {
    const { usePreferences } = await import('@/app/hooks/usePreferences');
    const { result } = renderHook(() => usePreferences());

    mockAuthenticatedApiRequest.mockImplementation((path: string) =>
      Promise.resolve(
        path.includes('/sync') ? spotifyUnavailableResponse() : { ok: true, data: { preferences: [] } },
      ),
    );

    await act(async () => {
      await result.current.syncSpotify();
    });

    expect(mockToastError).toHaveBeenCalledWith(
      'Spotify is temporarily unavailable. Try again later.'
    );
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('returns false (no crash) on both Spotify errors', async () => {
    const { usePreferences } = await import('@/app/hooks/usePreferences');
    const { result } = renderHook(() => usePreferences());

    // Route by URL so the result is independent of mount-effect timing: only the
    // /sync call fails; the mount and post-sync preference fetches succeed.
    mockAuthenticatedApiRequest.mockImplementation((path: string) =>
      Promise.resolve(
        path.includes('/sync') ? spotifyExpiredResponse() : { ok: true, data: { preferences: [] } },
      ),
    );

    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.syncSpotify();
    });

    expect(returnValue).toBe(false);
  });
});

// --------------------------------------------------------------------------
// useMatching — signOut guard
// --------------------------------------------------------------------------

describe('useMatching — SPOTIFY_TOKEN_EXPIRED must not signOut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchPotentialMatches: shows reconnect toast, does NOT call signOut', async () => {
    const { useMatching } = await import('@/app/hooks/useMatching');
    mockAuthenticatedApiRequest.mockResolvedValue(spotifyExpiredResponse());

    const { result } = renderHook(() => useMatching());

    await act(async () => {
      await result.current.fetchPotentialMatches();
    });

    expect(mockToastError).toHaveBeenCalledWith(
      'Your Spotify connection has expired.',
      expect.objectContaining({ action: expect.objectContaining({ label: 'Reconnect' }) })
    );
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('fetchPotentialMatchesProgressive: shows reconnect toast, does NOT call signOut', async () => {
    const { useMatching } = await import('@/app/hooks/useMatching');
    mockAuthenticatedApiRequest.mockResolvedValue(spotifyExpiredResponse());

    const { result } = renderHook(() => useMatching());

    await act(async () => {
      await result.current.fetchPotentialMatchesProgressive();
    });

    expect(mockToastError).toHaveBeenCalledWith(
      'Your Spotify connection has expired.',
      expect.any(Object)
    );
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('swipe: shows reconnect toast, rolls back optimistic advance, does NOT call signOut', async () => {
    const { useMatching } = await import('@/app/hooks/useMatching');

    // First call returns cards; subsequent swipe returns Spotify expired
    mockAuthenticatedApiRequest
      .mockResolvedValueOnce({
        ok: true,
        data: { matches: [{ userId: 'u1' }, { userId: 'u2' }], hasMore: false },
      })
      .mockResolvedValueOnce(spotifyExpiredResponse());

    const { result } = renderHook(() => useMatching());

    await act(async () => {
      await result.current.fetchPotentialMatches();
    });

    const indexBefore = result.current.currentMatchIndex;

    await act(async () => {
      await result.current.swipe('u1', 'like', 80);
    });

    expect(mockToastError).toHaveBeenCalledWith(
      'Your Spotify connection has expired.',
      expect.any(Object)
    );
    expect(mockSignOut).not.toHaveBeenCalled();
    // Optimistic advance was rolled back
    expect(result.current.currentMatchIndex).toBe(indexBefore);
  });

  it('fetchMatches: shows reconnect toast, does NOT call signOut', async () => {
    const { useMatching } = await import('@/app/hooks/useMatching');
    mockAuthenticatedApiRequest.mockResolvedValue(spotifyExpiredResponse());

    const { result } = renderHook(() => useMatching());

    await act(async () => {
      await result.current.fetchMatches();
    });

    expect(mockToastError).toHaveBeenCalledWith(
      'Your Spotify connection has expired.',
      expect.any(Object)
    );
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // Regression: real expired-JWT 401s must STILL sign out
  // ------------------------------------------------------------------

  it('fetchPotentialMatches: expired app JWT (UNAUTHORIZED) still calls signOut', async () => {
    const { useMatching } = await import('@/app/hooks/useMatching');
    mockAuthenticatedApiRequest.mockResolvedValue(expiredAppJwtResponse());

    const { result } = renderHook(() => useMatching());

    await act(async () => {
      await result.current.fetchPotentialMatches();
    });

    expect(mockSignOut).toHaveBeenCalledWith({ redirect: true, callbackUrl: '/login' });
    expect(mockToastError).not.toHaveBeenCalledWith(
      'Your Spotify connection has expired.',
      expect.anything()
    );
  });

  it('fetchMatches: expired app JWT still calls signOut', async () => {
    const { useMatching } = await import('@/app/hooks/useMatching');
    mockAuthenticatedApiRequest.mockResolvedValue(expiredAppJwtResponse());

    const { result } = renderHook(() => useMatching());

    await act(async () => {
      await result.current.fetchMatches();
    });

    expect(mockSignOut).toHaveBeenCalledWith({ redirect: true, callbackUrl: '/login' });
  });
});
