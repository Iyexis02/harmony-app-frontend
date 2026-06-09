/**
 * Batch F — Matching Error Code Handling
 * Integration tests for useMatching.ts swipe/score/unmatch error code branches.
 *
 * Runner: vitest
 * Install: npm install -D vitest @testing-library/react @testing-library/react-hooks
 * Run:     npx vitest run __tests__/batch-f-matching-error-codes.test.ts
 *
 * Mocks:
 *  - next-auth/react  → session with a fake token, no-op signOut
 *  - @/lib/api        → authenticatedApiRequest returns controlled ApiResult values
 *  - sonner           → spy on toast.error to assert messaging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks (hoisted so they apply before the hook module is imported)
// ---------------------------------------------------------------------------

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { accessToken: 'test-token' } }),
  signOut: vi.fn(),
}));

const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
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

function fail(code: string, message: string, status = 400) {
  return { ok: false as const, error: { status, code, message } };
}

/** A minimal PotentialMatchDto stub. */
function makeMatch(id: string) {
  return {
    userId: id,
    displayName: `User ${id}`,
    age: 25,
    compatibilityScore: 80,
    photoUrls: [],
    location: null,
    bio: null,
    topGenres: [],
    sharedGenres: [],
  };
}

/** A minimal MatchListItemDto stub. */
function makeMatchItem(matchId: string) {
  return {
    matchId,
    userId: `user-${matchId}`,
    displayName: `Match ${matchId}`,
    photoUrl: null,
    matchScore: 75,
    matchedAt: new Date().toISOString(),
    matchSource: 'mutual_swipe',
    conversationStarted: false,
  };
}

// ---------------------------------------------------------------------------
// swipe() — DUPLICATE_SWIPE (409)
// ---------------------------------------------------------------------------

describe('swipe() — DUPLICATE_SWIPE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the optimistic advance and returns null with no toast', async () => {
    const { result } = renderHook(() => useMatching());

    // Seed two potential matches so the queue has cards
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ matches: [makeMatch('A'), makeMatch('B')], hasMore: false })
      );
      await result.current.fetchPotentialMatches();
    });

    expect(result.current.currentMatchIndex).toBe(0);

    // Swipe triggers optimistic advance; server returns DUPLICATE_SWIPE
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail('DUPLICATE_SWIPE', 'Already swiped', 409));
      const ret = await result.current.swipe('A', 'like', 80);
      expect(ret).toBeNull();
    });

    // Index stays at 1 (optimistic advance kept) — NOT rolled back
    expect(result.current.currentMatchIndex).toBe(1);
    // No error toast
    expect(mockToastError).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// swipe() — NOT_FOUND (404)
// ---------------------------------------------------------------------------

describe('swipe() — NOT_FOUND', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes the ghost card from the queue, toasts, and does not leave an error state', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ matches: [makeMatch('ghost'), makeMatch('real')], hasMore: false })
      );
      await result.current.fetchPotentialMatches();
    });

    expect(result.current.potentialMatches).toHaveLength(2);

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail('NOT_FOUND', 'User not found', 404));
      await result.current.swipe('ghost', 'like', 80);
    });

    // Ghost card removed — only 'real' remains
    expect(result.current.potentialMatches).toHaveLength(1);
    expect(result.current.potentialMatches[0].userId).toBe('real');
    // Index was rolled back to prevIndex (0), which now points to 'real'
    expect(result.current.currentMatchIndex).toBe(0);
    expect(mockToastError).toHaveBeenCalledWith('This user is no longer available');
  });

  it('handles NOT_FOUND when it is the last card in the queue', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ matches: [makeMatch('only')], hasMore: false })
      );
      await result.current.fetchPotentialMatches();
    });

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail('NOT_FOUND', 'User not found', 404));
      await result.current.swipe('only', 'like', 80);
    });

    expect(result.current.potentialMatches).toHaveLength(0);
    expect(result.current.currentMatch).toBeUndefined();
    expect(mockToastError).toHaveBeenCalledWith('This user is no longer available');
  });
});

// ---------------------------------------------------------------------------
// swipe() — default error
// ---------------------------------------------------------------------------

describe('swipe() — default error', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rolls back the optimistic advance and toasts the error message', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ matches: [makeMatch('X'), makeMatch('Y')], hasMore: false })
      );
      await result.current.fetchPotentialMatches();
    });

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        fail('INTERNAL_ERROR', 'Something went wrong on the server', 500)
      );
      await result.current.swipe('X', 'like', 80);
    });

    // Index rolled back to 0
    expect(result.current.currentMatchIndex).toBe(0);
    expect(mockToastError).toHaveBeenCalledWith('Something went wrong on the server');
  });
});

// ---------------------------------------------------------------------------
// getMatchScore() — FORBIDDEN (403, blocked relationship)
// ---------------------------------------------------------------------------

describe('getMatchScore() — FORBIDDEN', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets scoreUnavailable=true and returns null', async () => {
    const { result } = renderHook(() => useMatching());

    expect(result.current.scoreUnavailable).toBe(false);

    let score: unknown;
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail('FORBIDDEN', 'Blocked', 403));
      score = await result.current.getMatchScore('user-123');
    });

    expect(score).toBeNull();
    expect(result.current.scoreUnavailable).toBe(true);
  });

  it('resets scoreUnavailable to false on a subsequent successful fetch', async () => {
    const { result } = renderHook(() => useMatching());

    // First: blocked
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail('FORBIDDEN', 'Blocked', 403));
      await result.current.getMatchScore('user-123');
    });
    expect(result.current.scoreUnavailable).toBe(true);

    // Second: success
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ overallScore: 90, genreScore: 85, locationScore: 70 })
      );
      await result.current.getMatchScore('user-123');
    });
    expect(result.current.scoreUnavailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getMatchScore() — INVALID_ARGUMENT (self-score edge case)
// ---------------------------------------------------------------------------

describe('getMatchScore() — INVALID_ARGUMENT', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs the error and returns null without setting scoreUnavailable', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useMatching());

    let score: unknown;
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        fail('INVALID_ARGUMENT', 'Cannot score yourself', 400)
      );
      score = await result.current.getMatchScore('self');
    });

    expect(score).toBeNull();
    expect(result.current.scoreUnavailable).toBe(false);
    // The hook logs via the structured logError() helper, which calls console.error
    // with a single object: { context, error, timestamp, ...meta }.
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        context: 'matching:get-score',
        error: 'Cannot score yourself',
        code: 'INVALID_ARGUMENT',
      })
    );
    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// unmatch() — NOT_FOUND (match already gone)
// ---------------------------------------------------------------------------

describe('unmatch() — NOT_FOUND', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes the stale match from local state, toasts, and returns true', async () => {
    const { result } = renderHook(() => useMatching());

    // Seed match list
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ matches: [makeMatchItem('m1'), makeMatchItem('m2')] })
      );
      await result.current.fetchMatches();
    });
    expect(result.current.matches).toHaveLength(2);

    let ret: boolean | undefined;
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail('NOT_FOUND', 'Match not found', 404));
      ret = await result.current.unmatch('m1');
    });

    expect(ret).toBe(true);
    expect(result.current.matches).toHaveLength(1);
    expect(result.current.matches[0].matchId).toBe('m2');
    expect(mockToastError).toHaveBeenCalledWith('Match no longer exists');
  });
});

// ---------------------------------------------------------------------------
// unmatch() — FORBIDDEN
// ---------------------------------------------------------------------------

describe('unmatch() — FORBIDDEN', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toasts "Unable to unmatch", leaves list unchanged, returns false', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ matches: [makeMatchItem('m1')] })
      );
      await result.current.fetchMatches();
    });

    let ret: boolean | undefined;
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail('FORBIDDEN', 'Forbidden', 403));
      ret = await result.current.unmatch('m1');
    });

    expect(ret).toBe(false);
    expect(result.current.matches).toHaveLength(1); // unchanged
    expect(mockToastError).toHaveBeenCalledWith('Unable to unmatch');
  });
});
