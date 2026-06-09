/**
 * Batch I — Rate Limit UI for Swipes & Score
 * Integration tests for useMatching.ts 429 handling.
 *
 * Runner: vitest
 * Install: npm install -D vitest @testing-library/react @testing-library/react-hooks
 * Run:     npx vitest run __tests__/batch-i-rate-limit-ui.test.ts
 *
 * Mocks:
 *  - next-auth/react  → session with a fake token, no-op signOut
 *  - @/lib/api        → authenticatedApiRequest returns controlled ApiResult values
 *  - sonner           → spy on toast.error / toast.warning to assert messaging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks (hoisted so they apply before the hook module is imported)
// ---------------------------------------------------------------------------

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { accessToken: 'test-token' } }),
  signOut: vi.fn(),
}));

const mockToastError = vi.fn();
const mockToastWarning = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    warning: (...args: unknown[]) => mockToastWarning(...args),
  },
}));

const mockAuthRequest = vi.fn();
vi.mock('@/lib/api', () => ({
  authenticatedApiRequest: (...args: unknown[]) => mockAuthRequest(...args),
  isEmailVerificationError: (error: { code?: string }) =>
    error.code === 'EMAIL_VERIFICATION_REQUIRED',
  EMAIL_VERIFICATION_REQUIRED: 'EMAIL_VERIFICATION_REQUIRED',
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { useMatching } from '../app/hooks/useMatching';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok<T>(data: T) {
  return { ok: true as const, data };
}

function fail429(retryAfter?: number) {
  return {
    ok: false as const,
    error: {
      status: 429,
      message: retryAfter != null
        ? `Too many attempts. Please try again in ${retryAfter} seconds.`
        : 'Too many attempts. Please try again later.',
      retryAfter,
    },
  };
}

function fail(code: string, message: string, status = 400) {
  return { ok: false as const, error: { status, code, message } };
}

/** A minimal PotentialMatchDto stub. */
function makeMatch(id: string) {
  return {
    userId: id,
    displayName: `User ${id}`,
    age: 25,
    matchScore: 80,
    photos: [],
    location: null,
    bio: null,
    topGenres: [],
    sharedGenres: [],
  };
}

// ---------------------------------------------------------------------------
// swipe() — 429 with Retry-After header value
// ---------------------------------------------------------------------------

describe('swipe() — 429 with retryAfter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rolls back optimistic advance, sets rateLimited, sets rateLimitResetAt, shows warning toast', async () => {
    const { result } = renderHook(() => useMatching());

    // Seed two matches
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ matches: [makeMatch('A'), makeMatch('B')], hasMore: false })
      );
      await result.current.fetchPotentialMatches();
    });

    expect(result.current.currentMatchIndex).toBe(0);
    expect(result.current.rateLimited).toBe(false);

    // Swipe triggers optimistic advance; server responds 429 with 15s Retry-After
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail429(15));
      const ret = await result.current.swipe('A', 'like', 80);
      expect(ret).toBeNull();
    });

    // Optimistic advance must be rolled back
    expect(result.current.currentMatchIndex).toBe(0);
    // rateLimited flag must be set
    expect(result.current.rateLimited).toBe(true);
    // rateLimitResetAt must be a future timestamp ~15s ahead
    expect(result.current.rateLimitResetAt).not.toBeNull();
    expect(result.current.rateLimitResetAt!).toBeGreaterThan(Date.now());
    // Warning toast must fire, not an error toast
    expect(mockToastWarning).toHaveBeenCalledWith("You're swiping too fast! Take a breather.");
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('clears rateLimited after the cooldown period expires', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ matches: [makeMatch('A'), makeMatch('B')], hasMore: false })
      );
      await result.current.fetchPotentialMatches();
    });

    // Trigger 429 with 5s cooldown
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail429(5));
      await result.current.swipe('A', 'like', 80);
    });

    expect(result.current.rateLimited).toBe(true);

    // Advance past the cooldown
    await act(async () => {
      vi.advanceTimersByTime(5001);
    });

    expect(result.current.rateLimited).toBe(false);
    expect(result.current.rateLimitResetAt).toBeNull();
  });

  it('uses 10s default cooldown when retryAfter is absent', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ matches: [makeMatch('A')], hasMore: false })
      );
      await result.current.fetchPotentialMatches();
    });

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail429(undefined));
      await result.current.swipe('A', 'like', 80);
    });

    expect(result.current.rateLimited).toBe(true);

    // Should still be rate limited at 9s
    await act(async () => {
      vi.advanceTimersByTime(9000);
    });
    expect(result.current.rateLimited).toBe(true);

    // Should clear at 10s
    await act(async () => {
      vi.advanceTimersByTime(1001);
    });
    expect(result.current.rateLimited).toBe(false);
  });

  it('card stays in the queue (not consumed) after a 429', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ matches: [makeMatch('A'), makeMatch('B')], hasMore: false })
      );
      await result.current.fetchPotentialMatches();
    });

    expect(result.current.currentMatch?.userId).toBe('A');

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail429(10));
      await result.current.swipe('A', 'like', 80);
    });

    // Card A must still be the current card
    expect(result.current.currentMatch?.userId).toBe('A');
    // Queue length unchanged
    expect(result.current.potentialMatches).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// swipe() — 429 does NOT consume a non-rate-limit error path
// ---------------------------------------------------------------------------

describe('swipe() — non-429 errors still roll back normally', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('INTERNAL_ERROR sets no rateLimited flag', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ matches: [makeMatch('A')], hasMore: false })
      );
      await result.current.fetchPotentialMatches();
    });

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail('INTERNAL_ERROR', 'Server error', 500));
      await result.current.swipe('A', 'like', 80);
    });

    expect(result.current.rateLimited).toBe(false);
    expect(result.current.rateLimitResetAt).toBeNull();
    expect(mockToastWarning).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith('Server error');
  });
});

// ---------------------------------------------------------------------------
// getMatchScore() — 429
// ---------------------------------------------------------------------------

describe('getMatchScore() — 429', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets scoreRateLimited=true and returns null', async () => {
    const { result } = renderHook(() => useMatching());

    expect(result.current.scoreRateLimited).toBe(false);

    let score: unknown;
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail429(8));
      score = await result.current.getMatchScore('user-123');
    });

    expect(score).toBeNull();
    expect(result.current.scoreRateLimited).toBe(true);
  });

  it('clears scoreRateLimited after cooldown', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail429(8));
      await result.current.getMatchScore('user-123');
    });
    expect(result.current.scoreRateLimited).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(8001);
    });
    expect(result.current.scoreRateLimited).toBe(false);
  });

  it('uses 10s default when retryAfter is absent', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail429(undefined));
      await result.current.getMatchScore('user-123');
    });

    expect(result.current.scoreRateLimited).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(9000);
    });
    expect(result.current.scoreRateLimited).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(1001);
    });
    expect(result.current.scoreRateLimited).toBe(false);
  });

  it('resets scoreRateLimited to false on a subsequent successful score fetch', async () => {
    const { result } = renderHook(() => useMatching());

    // First: 429
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail429(5));
      await result.current.getMatchScore('user-123');
    });
    expect(result.current.scoreRateLimited).toBe(true);

    // Second: success
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ overallScore: 88, musicScore: 90, locationScore: 70 })
      );
      await result.current.getMatchScore('user-123');
    });
    expect(result.current.scoreRateLimited).toBe(false);
  });

  it('does not set scoreRateLimited for non-429 errors', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail('FORBIDDEN', 'Blocked', 403));
      await result.current.getMatchScore('user-123');
    });

    expect(result.current.scoreRateLimited).toBe(false);
    // FORBIDDEN sets scoreUnavailable, not scoreRateLimited
    expect(result.current.scoreUnavailable).toBe(true);
  });
});
