/**
 * Batch K — Match List Pagination
 * Integration tests for fetchMatches / fetchMoreMatches in useMatching.ts.
 *
 * Runner: vitest
 * Install: npm install -D vitest @testing-library/react @testing-library/react-hooks
 * Run:     npx vitest run __tests__/batch-k-match-list-pagination.test.ts
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
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    warning: vi.fn(),
    success: vi.fn(),
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

/** Builds a minimal MatchListItemDto stub. */
function makeMatchItem(matchId: string, otherUserId = `user-${matchId}`) {
  return {
    matchId,
    otherUserId,
    otherUserName: `User ${matchId}`,
    otherUserPhoto: undefined,
    matchScore: 80,
    status: 'active',
    conversationStarted: false,
    matchSource: 'mutual_swipe',
    matchedAt: new Date().toISOString(),
  };
}

/** Builds a paginated matches response. */
function matchesPage(
  items: ReturnType<typeof makeMatchItem>[],
  hasMore: boolean
) {
  return ok({ matches: items, hasMore });
}

// ---------------------------------------------------------------------------
// fetchMatches — first page
// ---------------------------------------------------------------------------

describe('fetchMatches() — first page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends limit and offset=0 in the query string', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(matchesPage([], false));
      await result.current.fetchMatches('active');
    });

    expect(mockAuthRequest).toHaveBeenCalledWith(
      expect.stringContaining('limit=20'),
      'test-token'
    );
    expect(mockAuthRequest).toHaveBeenCalledWith(
      expect.stringContaining('offset=0'),
      'test-token'
    );
  });

  it('populates matches state with the returned items', async () => {
    const { result } = renderHook(() => useMatching());
    const items = [makeMatchItem('m1'), makeMatchItem('m2')];

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(matchesPage(items, false));
      await result.current.fetchMatches('active');
    });

    expect(result.current.matches).toHaveLength(2);
    expect(result.current.matches[0].matchId).toBe('m1');
    expect(result.current.matches[1].matchId).toBe('m2');
  });

  it('sets matchesHasMore=true when backend signals more pages', async () => {
    const { result } = renderHook(() => useMatching());
    const items = Array.from({ length: 20 }, (_, i) => makeMatchItem(`m${i}`));

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(matchesPage(items, true));
      await result.current.fetchMatches('active');
    });

    expect(result.current.matchesHasMore).toBe(true);
  });

  it('sets matchesHasMore=false when backend signals last page', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(matchesPage([makeMatchItem('m1')], false));
      await result.current.fetchMatches('active');
    });

    expect(result.current.matchesHasMore).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fetchMoreMatches — load next page
// ---------------------------------------------------------------------------

describe('fetchMoreMatches() — load next page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appends new items to the existing list', async () => {
    const { result } = renderHook(() => useMatching());
    const page1 = [makeMatchItem('m1'), makeMatchItem('m2')];
    const page2 = [makeMatchItem('m3'), makeMatchItem('m4')];

    // Fetch page 1 (hasMore=true)
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(matchesPage(page1, true));
      await result.current.fetchMatches('active');
    });

    expect(result.current.matches).toHaveLength(2);
    expect(result.current.matchesHasMore).toBe(true);

    // Fetch page 2 — should append
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(matchesPage(page2, false));
      await result.current.fetchMoreMatches('active');
    });

    expect(result.current.matches).toHaveLength(4);
    expect(result.current.matches.map((m) => m.matchId)).toEqual(['m1', 'm2', 'm3', 'm4']);
    expect(result.current.matchesHasMore).toBe(false);
  });

  it('sends the correct offset on the second call', async () => {
    const { result } = renderHook(() => useMatching());
    const page1 = [makeMatchItem('m1'), makeMatchItem('m2')];

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(matchesPage(page1, true));
      await result.current.fetchMatches('active');
    });

    mockAuthRequest.mockClear();

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(matchesPage([], false));
      await result.current.fetchMoreMatches('active');
    });

    // offset should be 2 (the number of items from page 1)
    expect(mockAuthRequest).toHaveBeenCalledWith(
      expect.stringContaining('offset=2'),
      'test-token'
    );
  });

  it('does nothing when matchesHasMore is false', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(matchesPage([makeMatchItem('m1')], false));
      await result.current.fetchMatches('active');
    });

    mockAuthRequest.mockClear();

    await act(async () => {
      await result.current.fetchMoreMatches('active');
    });

    // No request should be made
    expect(mockAuthRequest).not.toHaveBeenCalled();
    expect(result.current.matches).toHaveLength(1);
  });

  it('sets isFetchingMoreMatches=true during fetch and false when done', async () => {
    const { result } = renderHook(() => useMatching());

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(matchesPage([makeMatchItem('m1')], true));
      await result.current.fetchMatches('active');
    });

    expect(result.current.isFetchingMoreMatches).toBe(false);

    // Defer the request so the in-flight flag can be observed after React flushes
    // the setIsFetchingMoreMatches(true) update at the act() boundary. Reading
    // result.current synchronously inside the mock would see the pre-update value.
    let resolveFetch!: () => void;
    mockAuthRequest.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = () => resolve(matchesPage([], false));
        }),
    );

    let fetchPromise!: Promise<unknown>;
    await act(async () => {
      fetchPromise = result.current.fetchMoreMatches('active');
    });

    // Request is still in flight; the flag is now visible as true
    expect(result.current.isFetchingMoreMatches).toBe(true);

    await act(async () => {
      resolveFetch();
      await fetchPromise;
    });

    expect(result.current.isFetchingMoreMatches).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Filter change — resets pagination
// ---------------------------------------------------------------------------

describe('fetchMatches() — filter change resets pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces the list and resets offset when filter changes', async () => {
    const { result } = renderHook(() => useMatching());
    const activePage = [makeMatchItem('active-1'), makeMatchItem('active-2')];
    const allPage = [makeMatchItem('all-1')];

    // First fetch: active filter, page 1 with more
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(matchesPage(activePage, true));
      await result.current.fetchMatches('active');
    });

    expect(result.current.matches).toHaveLength(2);
    expect(result.current.matchesHasMore).toBe(true);

    // Second fetch: switch to 'all' filter — list must be replaced, not appended
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(matchesPage(allPage, false));
      await result.current.fetchMatches('all');
    });

    expect(result.current.matches).toHaveLength(1);
    expect(result.current.matches[0].matchId).toBe('all-1');
    expect(result.current.matchesHasMore).toBe(false);
  });

  it('sends offset=0 on filter change', async () => {
    const { result } = renderHook(() => useMatching());

    // Load a page so internal offset > 0
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(
        matchesPage([makeMatchItem('m1'), makeMatchItem('m2')], true)
      );
      await result.current.fetchMatches('active');
    });

    mockAuthRequest.mockClear();

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(matchesPage([], false));
      await result.current.fetchMatches('all');
    });

    expect(mockAuthRequest).toHaveBeenCalledWith(
      expect.stringContaining('offset=0'),
      'test-token'
    );
  });
});

// ---------------------------------------------------------------------------
// unmatch/block — local removal without re-fetch
// ---------------------------------------------------------------------------

describe('unmatch() — local removal without re-fetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes the unmatched item from local state without calling fetchMatches again', async () => {
    const { result } = renderHook(() => useMatching());
    const items = [makeMatchItem('m1'), makeMatchItem('m2'), makeMatchItem('m3')];

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(matchesPage(items, false));
      await result.current.fetchMatches('active');
    });

    expect(result.current.matches).toHaveLength(3);
    mockAuthRequest.mockClear();

    // Unmatch m2
    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(ok(null));
      await result.current.unmatch('m2');
    });

    expect(result.current.matches).toHaveLength(2);
    expect(result.current.matches.map((m) => m.matchId)).toEqual(['m1', 'm3']);
    // Only one request: the DELETE — no subsequent GET /matches
    expect(mockAuthRequest).toHaveBeenCalledTimes(1);
    expect(mockAuthRequest).toHaveBeenCalledWith(
      expect.stringContaining('/matches/m2'),
      'test-token',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('removes the item even when the server returns NOT_FOUND (already gone)', async () => {
    const { result } = renderHook(() => useMatching());
    const items = [makeMatchItem('m1'), makeMatchItem('m2')];

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(matchesPage(items, false));
      await result.current.fetchMatches('active');
    });

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(fail('NOT_FOUND', 'Match not found', 404));
      await result.current.unmatch('m1');
    });

    expect(result.current.matches).toHaveLength(1);
    expect(result.current.matches[0].matchId).toBe('m2');
  });
});

describe('blockMatch() — local removal without re-fetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes the blocked match from local state', async () => {
    const { result } = renderHook(() => useMatching());
    const items = [makeMatchItem('m1'), makeMatchItem('m2')];

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(matchesPage(items, false));
      await result.current.fetchMatches('active');
    });

    mockAuthRequest.mockClear();

    await act(async () => {
      mockAuthRequest.mockResolvedValueOnce(ok({ swipeId: 's1', action: 'block', resultedInMatch: false }));
      await result.current.blockMatch('user-m1', 'm1');
    });

    expect(result.current.matches).toHaveLength(1);
    expect(result.current.matches[0].matchId).toBe('m2');
    // Only the swipe POST — no GET /matches re-fetch
    expect(mockAuthRequest).toHaveBeenCalledTimes(1);
  });
});
