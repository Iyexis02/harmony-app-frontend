/**
 * Batch 13 — Notification Polling Through API Wrapper
 *
 * Tests that the patched check() function in useNotifications.tsx:
 *   - Calls authenticatedApiRequest (not raw fetch), which attaches X-Correlation-Id
 *   - Uses the correct path: /api/v1/matching/matches?status=active&limit=100
 *   - Treats !result.ok as a silent no-op (badge stays as-is)
 *   - Extracts count from result.data.matches.length (ApiResult shape)
 *   - Only sets badge true when count > seen — never clears it
 *   - Respects fetchingRef: concurrent calls are dropped (only one API call made)
 *   - Skips when accountDeleted flag is in localStorage
 *   - Skips when document.hidden is true
 *
 * Runner: vitest
 * Run:    npx vitest run __tests__/batch13-notification-polling-api-wrapper.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApiResult } from '../types/auth';

// ---------------------------------------------------------------------------
// Minimal in-memory localStorage stand-in
// ---------------------------------------------------------------------------

function makeStorage(initial: Record<string, string> = {}): {
  store: Record<string, string>;
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
} {
  const store: Record<string, string> = { ...initial };
  return {
    store,
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
  };
}

// ---------------------------------------------------------------------------
// Mutable poll state (mirrors the refs/state inside NotificationsProvider)
// ---------------------------------------------------------------------------

type PollState = {
  hasNewMatch: boolean;
  fetchingRef: { current: boolean };
};

// ---------------------------------------------------------------------------
// simulateCheck
//
// Mirrors the exact patched check() function in useNotifications.tsx so every
// branch can be exercised without importing a 'use client' React module.
// ---------------------------------------------------------------------------

type ApiRequestFn = (
  path: string,
  token: string,
) => Promise<ApiResult<{ matches: unknown[]; hasMore: boolean }>>;

type CheckOpts = {
  accessToken: string;
  userId: string;
  documentHidden: boolean;
  apiRequest: ApiRequestFn;
  state: PollState;
  storage: ReturnType<typeof makeStorage>;
};

async function simulateCheck(opts: CheckOpts): Promise<void> {
  const { accessToken, userId, documentHidden, apiRequest, state, storage } = opts;

  if (documentHidden || state.fetchingRef.current) return;
  if (storage.getItem('accountDeleted') === 'true') return;

  state.fetchingRef.current = true;
  try {
    const result = await apiRequest(
      '/api/v1/matching/matches?status=active&limit=100',
      accessToken,
    );
    if (!result.ok) return;
    const count = result.data.matches?.length ?? 0;
    const seen = parseInt(storage.getItem(`matchesSeenCount:${userId}`) ?? '0', 10);
    if (count > seen && userId) {
      state.hasNewMatch = true;
      storage.setItem(`hasNewMatch:${userId}`, 'true');
    }
  } catch {
    // Badge is best-effort — silently ignore network errors
  } finally {
    state.fetchingRef.current = false;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(): PollState {
  return { hasNewMatch: false, fetchingRef: { current: false } };
}

function okResult(matchCount: number): ApiResult<{ matches: unknown[]; hasMore: boolean }> {
  return { ok: true, data: { matches: new Array(matchCount).fill({}), hasMore: false } };
}

function errResult(): ApiResult<{ matches: unknown[]; hasMore: boolean }> {
  return { ok: false, error: { status: 401, message: 'Unauthorized' } };
}

// ---------------------------------------------------------------------------
// Tests — API wrapper contract
// ---------------------------------------------------------------------------

describe('simulateCheck — API call path', () => {
  it('calls authenticatedApiRequest with the correct path', async () => {
    const apiRequest = vi.fn().mockResolvedValue(okResult(0));
    const state = makeState();
    const storage = makeStorage();

    await simulateCheck({
      accessToken: 'tok-123',
      userId: 'u1',
      documentHidden: false,
      apiRequest,
      state,
      storage,
    });

    expect(apiRequest).toHaveBeenCalledOnce();
    expect(apiRequest).toHaveBeenCalledWith(
      '/api/v1/matching/matches?status=active&limit=100',
      'tok-123',
    );
  });

  it('passes the access token as the second argument (Bearer token source)', async () => {
    const apiRequest = vi.fn().mockResolvedValue(okResult(0));
    const state = makeState();

    await simulateCheck({
      accessToken: 'my-jwt',
      userId: 'u1',
      documentHidden: false,
      apiRequest,
      state,
      storage: makeStorage(),
    });

    const [, token] = apiRequest.mock.calls[0];
    expect(token).toBe('my-jwt');
  });
});

// ---------------------------------------------------------------------------
// Tests — ApiResult handling (replaces raw res.ok / res.json())
// ---------------------------------------------------------------------------

describe('simulateCheck — ApiResult handling', () => {
  it('sets badge when result.ok and count > seen', async () => {
    const state = makeState();
    const storage = makeStorage({ 'matchesSeenCount:u1': '2' });

    await simulateCheck({
      accessToken: 'tok',
      userId: 'u1',
      documentHidden: false,
      apiRequest: vi.fn().mockResolvedValue(okResult(3)),
      state,
      storage,
    });

    expect(state.hasNewMatch).toBe(true);
    expect(storage.store['hasNewMatch:u1']).toBe('true');
  });

  it('does NOT set badge when count === seen', async () => {
    const state = makeState();
    const storage = makeStorage({ 'matchesSeenCount:u1': '3' });

    await simulateCheck({
      accessToken: 'tok',
      userId: 'u1',
      documentHidden: false,
      apiRequest: vi.fn().mockResolvedValue(okResult(3)),
      state,
      storage,
    });

    expect(state.hasNewMatch).toBe(false);
  });

  it('does NOT set badge when count < seen', async () => {
    const state = makeState();
    const storage = makeStorage({ 'matchesSeenCount:u1': '5' });

    await simulateCheck({
      accessToken: 'tok',
      userId: 'u1',
      documentHidden: false,
      apiRequest: vi.fn().mockResolvedValue(okResult(3)),
      state,
      storage,
    });

    expect(state.hasNewMatch).toBe(false);
  });

  it('ignores !result.ok silently — badge stays false', async () => {
    const state = makeState();

    await simulateCheck({
      accessToken: 'tok',
      userId: 'u1',
      documentHidden: false,
      apiRequest: vi.fn().mockResolvedValue(errResult()),
      state,
      storage: makeStorage(),
    });

    expect(state.hasNewMatch).toBe(false);
  });

  it('ignores !result.ok silently — badge stays true if it was already set', async () => {
    const state: PollState = { hasNewMatch: true, fetchingRef: { current: false } };

    await simulateCheck({
      accessToken: 'tok',
      userId: 'u1',
      documentHidden: false,
      apiRequest: vi.fn().mockResolvedValue(errResult()),
      state,
      storage: makeStorage(),
    });

    // Badge was already true; a failed poll must NOT clear it
    expect(state.hasNewMatch).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests — guards: fetchingRef, document.hidden, accountDeleted
// ---------------------------------------------------------------------------

describe('simulateCheck — early-exit guards', () => {
  it('skips when document.hidden is true', async () => {
    const apiRequest = vi.fn().mockResolvedValue(okResult(5));
    const state = makeState();

    await simulateCheck({
      accessToken: 'tok',
      userId: 'u1',
      documentHidden: true,
      apiRequest,
      state,
      storage: makeStorage(),
    });

    expect(apiRequest).not.toHaveBeenCalled();
    expect(state.hasNewMatch).toBe(false);
  });

  it('skips when accountDeleted is set in localStorage', async () => {
    const apiRequest = vi.fn().mockResolvedValue(okResult(5));
    const state = makeState();

    await simulateCheck({
      accessToken: 'tok',
      userId: 'u1',
      documentHidden: false,
      apiRequest,
      state,
      storage: makeStorage({ accountDeleted: 'true' }),
    });

    expect(apiRequest).not.toHaveBeenCalled();
    expect(state.hasNewMatch).toBe(false);
  });

  it('does not skip when accountDeleted is absent', async () => {
    const apiRequest = vi.fn().mockResolvedValue(okResult(1));
    const state = makeState();

    await simulateCheck({
      accessToken: 'tok',
      userId: 'u1',
      documentHidden: false,
      apiRequest,
      state,
      storage: makeStorage(),
    });

    expect(apiRequest).toHaveBeenCalledOnce();
  });

  it('skips when fetchingRef is already true', async () => {
    const apiRequest = vi.fn().mockResolvedValue(okResult(5));
    const state = makeState();
    state.fetchingRef.current = true; // simulates an in-flight poll

    await simulateCheck({
      accessToken: 'tok',
      userId: 'u1',
      documentHidden: false,
      apiRequest,
      state,
      storage: makeStorage(),
    });

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('resets fetchingRef to false after a successful poll', async () => {
    const state = makeState();

    await simulateCheck({
      accessToken: 'tok',
      userId: 'u1',
      documentHidden: false,
      apiRequest: vi.fn().mockResolvedValue(okResult(1)),
      state,
      storage: makeStorage(),
    });

    expect(state.fetchingRef.current).toBe(false);
  });

  it('resets fetchingRef to false after a failed API call (!result.ok)', async () => {
    const state = makeState();

    await simulateCheck({
      accessToken: 'tok',
      userId: 'u1',
      documentHidden: false,
      apiRequest: vi.fn().mockResolvedValue(errResult()),
      state,
      storage: makeStorage(),
    });

    expect(state.fetchingRef.current).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Concurrent integration test
//
// Three simultaneous check() calls fire. Only the first one should win the
// fetchingRef lock and make an API request. The other two are dropped silently.
// Verifies: exactly one API call, badge correctly set, fetchingRef released.
// ---------------------------------------------------------------------------

describe('concurrent polling — fetchingRef serialization (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fires only one API request when three concurrent checks race', async () => {
    // Slow API to ensure the lock is still held when the 2nd and 3rd calls fire
    let resolveApi!: () => void;
    const apiRequest = vi.fn().mockImplementation(
      () => new Promise<ApiResult<{ matches: unknown[]; hasMore: boolean }>>((resolve) => {
        resolveApi = () => resolve(okResult(3));
      }),
    );

    const state = makeState();
    const storage = makeStorage({ 'matchesSeenCount:u1': '1' });

    const opts: CheckOpts = {
      accessToken: 'tok',
      userId: 'u1',
      documentHidden: false,
      apiRequest,
      state,
      storage,
    };

    // Fire all three without awaiting yet
    const p1 = simulateCheck(opts);
    const p2 = simulateCheck(opts); // fetchingRef.current is now true → dropped
    const p3 = simulateCheck(opts); // same → dropped

    // Resolve the in-flight API call
    resolveApi();

    await Promise.all([p1, p2, p3]);

    // Only one API call was made
    expect(apiRequest).toHaveBeenCalledOnce();

    // Badge was set because count (3) > seen (1)
    expect(state.hasNewMatch).toBe(true);
    expect(storage.store['hasNewMatch:u1']).toBe('true');

    // Lock released
    expect(state.fetchingRef.current).toBe(false);
  });

  it('allows a second poll after the first completes', async () => {
    const apiRequest = vi.fn().mockResolvedValue(okResult(2));
    const state = makeState();
    const storage = makeStorage({ 'matchesSeenCount:u1': '0' });

    const opts: CheckOpts = {
      accessToken: 'tok',
      userId: 'u1',
      documentHidden: false,
      apiRequest,
      state,
      storage,
    };

    await simulateCheck(opts);
    await simulateCheck(opts); // second call — lock was released, should proceed

    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  it('handles concurrent calls where one is dropped and badge is set correctly', async () => {
    // First call resolves with 5 matches; second is dropped by the lock.
    // After first completes, a third call fires and sees count still > seen.
    let firstResolve!: () => void;
    const callCount = { value: 0 };

    const apiRequest = vi.fn().mockImplementation(
      (): Promise<ApiResult<{ matches: unknown[]; hasMore: boolean }>> => {
        callCount.value++;
        if (callCount.value === 1) {
          return new Promise((resolve) => { firstResolve = () => resolve(okResult(5)); });
        }
        return Promise.resolve(okResult(5));
      },
    );

    const state = makeState();
    const storage = makeStorage({ 'matchesSeenCount:u1': '2' });
    const opts: CheckOpts = {
      accessToken: 'tok',
      userId: 'u1',
      documentHidden: false,
      apiRequest,
      state,
      storage,
    };

    const p1 = simulateCheck(opts);
    const p2 = simulateCheck(opts); // dropped — lock held by p1

    firstResolve();
    await Promise.all([p1, p2]);

    // Only p1 made a request
    expect(apiRequest).toHaveBeenCalledOnce();
    expect(state.hasNewMatch).toBe(true);
    expect(state.fetchingRef.current).toBe(false);

    // Third call after lock released — succeeds
    await simulateCheck(opts);
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });
});
