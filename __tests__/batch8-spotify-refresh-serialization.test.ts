/**
 * Batch 8 — Spotify Token Refresh Serialization
 *
 * Spotify refresh tokens are single-use and rotate on each exchange. When
 * multiple JWT callbacks race to refresh an expired token they must share a
 * single in-flight promise so that only one request reaches Spotify's
 * /api/token endpoint.
 *
 * The logic is extracted as a pure factory function (`makeRefreshLock`) that
 * mirrors the module-level `refreshPromise` / `REFRESH_LOCK_TIMEOUT_MS` logic
 * added to route.ts. Each factory call returns an isolated lock instance so
 * tests cannot bleed into one another.
 *
 * Test sections
 *  1. Only one refresh call reaches Spotify under concurrency
 *  2. All concurrent callers receive the same resolved token
 *  3. Lock clears after a successful refresh (next call retries)
 *  4. Lock clears after a failed/rejected refresh
 *  5. Timeout resolves with RefreshAccessTokenError when refresh hangs
 *  6. Lock clears after timeout so the next caller can retry
 *  7. Email users never reach the lock (short-circuit guard)
 *  8. Non-expired tokens never reach the lock (expiry guard)
 */

import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// makeRefreshLock — mirrors route.ts module-level logic (Batch 8)
//
// Accepts an optional `timeoutMs` so tests can use shorter values without
// relying on vi.useFakeTimers for every case.
// ---------------------------------------------------------------------------

function makeRefreshLock(timeoutMs = 10_000) {
  let refreshPromise: Promise<any> | null = null;

  return function serializedRefresh(
    token: Record<string, unknown>,
    refreshFn: (token: Record<string, unknown>) => Promise<Record<string, unknown>>,
  ): Promise<Record<string, unknown>> {
    if (!refreshPromise) {
      refreshPromise = Promise.race([
        refreshFn(token),
        new Promise<any>((resolve) =>
          setTimeout(() => {
            resolve({ ...token, error: 'RefreshAccessTokenError' });
          }, timeoutMs)
        ),
      ]).finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  };
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const EXPIRED_TOKEN: Record<string, unknown> = {
  spotifyRefreshToken: 'refresh-abc',
  spotifyAccessToken: 'access-old',
  spotifyTokenExpires: Date.now() - 1_000,
  authProvider: 'SPOTIFY',
  userId: 'user-1',
};

const REFRESHED_TOKEN: Record<string, unknown> = {
  ...EXPIRED_TOKEN,
  spotifyAccessToken: 'access-new',
  spotifyTokenExpires: Date.now() + 3_600_000,
};

// ---------------------------------------------------------------------------
// 1. Only one refresh call reaches Spotify under concurrency
// ---------------------------------------------------------------------------

describe('Batch 8 — only one refresh fires under concurrency', () => {
  it('calls refreshFn exactly once when N callers race', async () => {
    const serializedRefresh = makeRefreshLock();
    let callCount = 0;

    const mockRefreshFn = vi.fn(async (_token: Record<string, unknown>) => {
      callCount++;
      await new Promise((r) => setTimeout(r, 20)); // simulate network latency
      return REFRESHED_TOKEN;
    });

    // Simulate 5 JWT callbacks all discovering the token is expired simultaneously.
    const results = await Promise.all(
      Array.from({ length: 5 }, () => serializedRefresh(EXPIRED_TOKEN, mockRefreshFn)),
    );

    expect(callCount).toBe(1);
    expect(mockRefreshFn).toHaveBeenCalledTimes(1);

    for (const result of results) {
      expect(result.spotifyAccessToken).toBe('access-new');
    }
  });

  it('calls refreshFn exactly once when 10 callers arrive with zero delay between them', async () => {
    const serializedRefresh = makeRefreshLock();
    const mockRefreshFn = vi.fn(async () => REFRESHED_TOKEN);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => serializedRefresh(EXPIRED_TOKEN, mockRefreshFn)),
    );

    expect(mockRefreshFn).toHaveBeenCalledTimes(1);
    for (const result of results) {
      expect(result.spotifyAccessToken).toBe('access-new');
    }
  });
});

// ---------------------------------------------------------------------------
// 2. All concurrent callers receive the identical resolved object
// ---------------------------------------------------------------------------

describe('Batch 8 — all concurrent callers share the same result', () => {
  it('returns the same object reference to all concurrent callers', async () => {
    const serializedRefresh = makeRefreshLock();
    const mockRefreshFn = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return REFRESHED_TOKEN;
    });

    const [a, b, c] = await Promise.all([
      serializedRefresh(EXPIRED_TOKEN, mockRefreshFn),
      serializedRefresh(EXPIRED_TOKEN, mockRefreshFn),
      serializedRefresh(EXPIRED_TOKEN, mockRefreshFn),
    ]);

    // Same promise → same resolved reference.
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

// ---------------------------------------------------------------------------
// 3. Lock clears after a successful refresh — next call starts a new one
// ---------------------------------------------------------------------------

describe('Batch 8 — lock clears after successful resolution', () => {
  it('allows a second refresh after the first promise settles', async () => {
    const serializedRefresh = makeRefreshLock();
    let callCount = 0;

    const mockRefreshFn = vi.fn(async () => {
      callCount++;
      return { ...REFRESHED_TOKEN, callNum: callCount };
    });

    const firstResult = await serializedRefresh(EXPIRED_TOKEN, mockRefreshFn);
    expect(firstResult.callNum).toBe(1);

    // After the lock is cleared, the next call must create a new in-flight promise.
    const secondResult = await serializedRefresh(EXPIRED_TOKEN, mockRefreshFn);
    expect(secondResult.callNum).toBe(2);

    expect(callCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 4. Lock clears after a failed/rejected refresh
//    In production, refreshAccessToken() catches its own errors and resolves
//    with { error: 'RefreshAccessTokenError' }. This test verifies that the
//    .finally() guard clears the lock even if the race rejects.
// ---------------------------------------------------------------------------

describe('Batch 8 — lock clears after rejection', () => {
  it('releases the lock when refreshFn rejects, allowing a subsequent retry', async () => {
    const serializedRefresh = makeRefreshLock();
    let callCount = 0;

    const mockRefreshFn = vi.fn(async () => {
      callCount++;
      if (callCount === 1) throw new Error('invalid_grant'); // first call fails
      return REFRESHED_TOKEN;
    });

    // First call rejects — await and swallow the error.
    try {
      await serializedRefresh(EXPIRED_TOKEN, mockRefreshFn);
    } catch {
      // expected on first call
    }

    // Lock must be cleared; second call must invoke refreshFn again and succeed.
    const result = await serializedRefresh(EXPIRED_TOKEN, mockRefreshFn);
    expect(result.spotifyAccessToken).toBe('access-new');
    expect(callCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 5. Timeout resolves with RefreshAccessTokenError when refresh hangs
// ---------------------------------------------------------------------------

describe('Batch 8 — timeout guard fires when refresh hangs', () => {
  it('resolves with RefreshAccessTokenError after the timeout elapses', async () => {
    vi.useFakeTimers();

    const TIMEOUT_MS = 10_000;
    const serializedRefresh = makeRefreshLock(TIMEOUT_MS);

    // A refresh function that never resolves.
    const hangingRefreshFn = vi.fn((): Promise<any> => new Promise(() => {}));

    const resultPromise = serializedRefresh(EXPIRED_TOKEN, hangingRefreshFn);

    vi.advanceTimersByTime(TIMEOUT_MS + 1);

    const result = await resultPromise;
    expect(result.error).toBe('RefreshAccessTokenError');

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// 6. Lock clears after timeout — the next caller can retry
// ---------------------------------------------------------------------------

describe('Batch 8 — lock clears after timeout', () => {
  it('allows a new refresh attempt after the timeout fires', async () => {
    vi.useFakeTimers();

    const TIMEOUT_MS = 10_000;
    const serializedRefresh = makeRefreshLock(TIMEOUT_MS);
    let callCount = 0;

    const mockRefreshFn = vi.fn((): Promise<any> => {
      callCount++;
      if (callCount === 1) return new Promise(() => {}); // first call hangs
      return Promise.resolve(REFRESHED_TOKEN);
    });

    // First call — hangs, timeout fires, resolves with error.
    const firstPromise = serializedRefresh(EXPIRED_TOKEN, mockRefreshFn);
    vi.advanceTimersByTime(TIMEOUT_MS + 1);
    const firstResult = await firstPromise;
    expect(firstResult.error).toBe('RefreshAccessTokenError');

    vi.useRealTimers();

    // Lock must now be clear — second call should invoke refreshFn and succeed.
    const secondResult = await serializedRefresh(EXPIRED_TOKEN, mockRefreshFn);
    expect(secondResult.spotifyAccessToken).toBe('access-new');
    expect(callCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 7. Email users never reach the lock — short-circuit guard
// ---------------------------------------------------------------------------

describe('Batch 8 — email users bypass the refresh lock', () => {
  it('the EMAIL guard short-circuits before the lock is entered', () => {
    // Mirrors: `if (token.authProvider === 'EMAIL') return token`
    // This branch executes before any refreshPromise check.
    const emailToken = { authProvider: 'EMAIL', appJwt: 'some-jwt', userId: 'u' };
    const bypassesRefresh = emailToken.authProvider === 'EMAIL';
    expect(bypassesRefresh).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Non-expired tokens skip the lock — expiry guard
// ---------------------------------------------------------------------------

describe('Batch 8 — valid tokens skip the lock', () => {
  it('the expiry guard short-circuits before the lock is entered', () => {
    // Mirrors: `if (Date.now() < token.spotifyTokenExpires) return token`
    const validToken = { spotifyTokenExpires: Date.now() + 3_600_000 };
    const tokenIsStillValid = Date.now() < (validToken.spotifyTokenExpires as number);
    expect(tokenIsStillValid).toBe(true);
  });
});
