/**
 * Batch J — Block User UI
 * Integration tests for useMatching.ts blockMatch() function.
 *
 * Runner: vitest
 * Install: npm install -D vitest @testing-library/react @testing-library/react-hooks
 * Run:     npx vitest run __tests__/batch-j-block-user.test.ts
 *
 * Mocks:
 *  - next-auth/react  → session with a fake token, no-op signOut
 *  - @/lib/api        → authenticatedApiRequest returns controlled ApiResult values
 *  - sonner           → spy on toast.error / toast.success to assert messaging
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
const mockToastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
    warning: vi.fn(),
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

function fail(code: string, message: string, status = 400) {
  return { ok: false as const, error: { status, code, message } };
}

function makeMatch(id: string) {
  return {
    userId: id,
    displayName: `User ${id}`,
    age: 25,
    matchScore: 75,
    photos: [],
    location: null,
    bio: null,
    topGenres: [],
    sharedGenres: [],
  };
}

function makeMatchListItem(matchId: string, otherUserId: string) {
  return {
    matchId,
    otherUserId,
    otherUserName: `User ${otherUserId}`,
    otherUserPhoto: null,
    matchScore: 75,
    matchedAt: new Date().toISOString(),
    status: 'active',
  };
}

const BLOCK_SWIPE_RESPONSE = ok({
  swipeId: 'swipe-block-1',
  swipedUserId: 'user-B',
  action: 'block',
  resultedInMatch: false,
  match: null,
});

// ---------------------------------------------------------------------------
// blockMatch() — success path
// ---------------------------------------------------------------------------

describe('blockMatch() — success', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POSTs to /matching/swipe with action: "block" and platform: "web"', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(BLOCK_SWIPE_RESPONSE);
      await result.current.blockMatch('user-B');
    });

    expect(mockAuthRequest).toHaveBeenCalledWith(
      '/api/v1/matching/swipe',
      'test-token',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ swipedUserId: 'user-B', action: 'block', platform: 'web' }),
      })
    );
  });

  it('returns true on success', async () => {
    const { result } = renderHook(() => useMatching());

    let returnVal: boolean | undefined;
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(BLOCK_SWIPE_RESPONSE);
      returnVal = await result.current.blockMatch('user-B');
    });

    expect(returnVal).toBe(true);
  });

  it('shows "User blocked" success toast', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(BLOCK_SWIPE_RESPONSE);
      await result.current.blockMatch('user-B');
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('User blocked');
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('removes the match from local state when matchId is provided', async () => {
    const { result } = renderHook(() => useMatching());

    // Seed the match list
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ matches: [makeMatchListItem('match-1', 'user-B'), makeMatchListItem('match-2', 'user-C')] })
      );
      await result.current.fetchMatches('active');
    });

    expect(result.current.matches).toHaveLength(2);

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(BLOCK_SWIPE_RESPONSE);
      await result.current.blockMatch('user-B', 'match-1');
    });

    expect(result.current.matches).toHaveLength(1);
    expect(result.current.matches[0].matchId).toBe('match-2');
  });

  it('does not modify match list when matchId is omitted', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ matches: [makeMatchListItem('match-1', 'user-B')] })
      );
      await result.current.fetchMatches('active');
    });

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(BLOCK_SWIPE_RESPONSE);
      await result.current.blockMatch('user-B');
    });

    // No matchId given — list unchanged
    expect(result.current.matches).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// blockMatch() — DUPLICATE_SWIPE treated as success
// ---------------------------------------------------------------------------

describe('blockMatch() — DUPLICATE_SWIPE', () => {
  beforeEach(() => vi.clearAllMocks());

  it('treats DUPLICATE_SWIPE as success, returns true, shows toast', async () => {
    const { result } = renderHook(() => useMatching());

    let returnVal: boolean | undefined;
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail('DUPLICATE_SWIPE', 'Already swiped', 409));
      returnVal = await result.current.blockMatch('user-B', 'match-1');
    });

    expect(returnVal).toBe(true);
    expect(mockToastSuccess).toHaveBeenCalledWith('User blocked');
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('removes match from state on DUPLICATE_SWIPE when matchId provided', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ matches: [makeMatchListItem('match-1', 'user-B')] })
      );
      await result.current.fetchMatches('active');
    });

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail('DUPLICATE_SWIPE', 'Already swiped', 409));
      await result.current.blockMatch('user-B', 'match-1');
    });

    expect(result.current.matches).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// blockMatch() — error paths
// ---------------------------------------------------------------------------

describe('blockMatch() — error paths', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns false and shows error toast on INTERNAL_ERROR', async () => {
    const { result } = renderHook(() => useMatching());

    let returnVal: boolean | undefined;
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail('INTERNAL_ERROR', 'Server error', 500));
      returnVal = await result.current.blockMatch('user-B');
    });

    expect(returnVal).toBe(false);
    expect(mockToastError).toHaveBeenCalledWith('Server error');
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('returns false and shows fallback toast when error message is empty', async () => {
    const { result } = renderHook(() => useMatching());

    let returnVal: boolean | undefined;
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce({ ok: false, error: { status: 500, message: '', code: 'INTERNAL_ERROR' } });
      returnVal = await result.current.blockMatch('user-B');
    });

    expect(returnVal).toBe(false);
    expect(mockToastError).toHaveBeenCalledWith('Block failed');
  });

  it('returns false and shows error toast on network failure', async () => {
    const { result } = renderHook(() => useMatching());

    let returnVal: boolean | undefined;
    await act(async () => {
      mockAuthRequest.mockRejectedValueOnce(new Error('Network error'));
      returnVal = await result.current.blockMatch('user-B');
    });

    expect(returnVal).toBe(false);
    expect(mockToastError).toHaveBeenCalledWith('Block failed — please try again');
  });

  it('does NOT remove the match from state on failure', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ matches: [makeMatchListItem('match-1', 'user-B')] })
      );
      await result.current.fetchMatches('active');
    });

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail('INTERNAL_ERROR', 'Server error', 500));
      await result.current.blockMatch('user-B', 'match-1');
    });

    // Match must still be in the list after a failed block
    expect(result.current.matches).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// swipe() — 'block' is a valid action (not rejected by the guard)
// ---------------------------------------------------------------------------

describe("swipe() — 'block' is a valid SwipeAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not reject 'block' as an invalid action", async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ matches: [makeMatch('A')], hasMore: false })
      );
      await result.current.fetchPotentialMatches();
    });

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({ swipeId: 's1', swipedUserId: 'A', action: 'block', resultedInMatch: false, match: null })
      );
      const ret = await result.current.swipe('A', 'block', 75);
      // A non-null return means it reached the server call; null would mean guard rejected it
      expect(ret).not.toBeUndefined();
    });

    // The POST must have been made (second call after the fetch)
    expect(mockAuthRequest).toHaveBeenCalledTimes(2);
    const [, options] = mockAuthRequest.mock.calls[1];
    void options; // called with (url, token, options)
    const callArgs = mockAuthRequest.mock.calls[1];
    const body = JSON.parse(callArgs[2].body);
    expect(body.action).toBe('block');
  });
});

// ---------------------------------------------------------------------------
// Concurrent blockMatch() calls (two blocks in parallel)
// ---------------------------------------------------------------------------

describe('blockMatch() — concurrent calls', () => {
  beforeEach(() => vi.clearAllMocks());

  it('handles two concurrent block calls independently without cross-contamination', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        ok({
          matches: [
            makeMatchListItem('match-1', 'user-B'),
            makeMatchListItem('match-2', 'user-C'),
          ],
        })
      );
      await result.current.fetchMatches('active');
    });

    expect(result.current.matches).toHaveLength(2);

    // Fire two block calls concurrently — each gets its own resolved response
    await act(async () => {
      mockAuthRequest
        .mockResolvedValueOnce(ok({ swipeId: 's1', action: 'block', resultedInMatch: false, match: null }))
        .mockResolvedValueOnce(ok({ swipeId: 's2', action: 'block', resultedInMatch: false, match: null }));

      await Promise.all([
        result.current.blockMatch('user-B', 'match-1'),
        result.current.blockMatch('user-C', 'match-2'),
      ]);
    });

    // Both matches must be removed
    expect(result.current.matches).toHaveLength(0);
    expect(mockToastSuccess).toHaveBeenCalledTimes(2);
  });
});
