/**
 * Batch 9 — Account Deletion Request Cancellation
 *
 * Tests the localStorage `accountDeleted` flag mechanism that prevents
 * in-flight hook requests from racing with the settings page signOut.
 *
 * Runner: vitest
 * Run:    npx vitest run __tests__/batch9-account-deletion-cancellation.test.ts
 *
 * What is tested:
 *   1. Successful deletion sets the flag, calls signOut({ redirect: false }),
 *      then navigates to '/'.
 *   2. Failed deletion (wrong password) does NOT set the flag — session is
 *      still valid and the user can retry.
 *   3. Failed deletion (network error) does NOT set the flag.
 *   4. Notification poll is skipped when the flag is present (prevents 401
 *      cascade from the dead token).
 *   5. useMatching's 401 handler skips signOut when the flag is present
 *      (prevents redirect to /login racing with the settings-page router.push).
 *   6. Concurrent scenario: deletion races with an in-flight poll — only one
 *      signOut fires, and it uses redirect: false.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Minimal localStorage shim (vitest default env is 'node', no DOM)
// ---------------------------------------------------------------------------

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};

function makeResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Simulate handleDeleteAccount (mirrors app/profile/settings/page.tsx)
// ---------------------------------------------------------------------------

type DeleteResult =
  | { outcome: 'deleted'; signOutArgs: object; navigatedTo: string }
  | { outcome: 'wrong-password'; passwordError: string }
  | { outcome: 'backend-error'; toastMessage: string }
  | { outcome: 'network-error'; toastMessage: string };

async function simulateHandleDeleteAccount(opts: {
  authProvider: 'EMAIL' | 'SPOTIFY';
  password?: string;
  deleteConfirmText?: string;
  fetchResponse: Response | 'throw';
  signOut: (args: object) => Promise<void>;
  routerPush: (path: string) => void;
  toastError: (msg: string) => void;
}): Promise<DeleteResult> {
  const {
    authProvider, password = '', deleteConfirmText = 'DELETE',
    fetchResponse, signOut, routerPush, toastError,
  } = opts;

  const isEmail = authProvider === 'EMAIL';
  if (isEmail && !password) throw new Error('guard: password required');
  if (!isEmail && deleteConfirmText !== 'DELETE') throw new Error('guard: confirm text required');

  const token = 'test-jwt';
  const API_BASE = 'http://127.0.0.1:8080';

  try {
    let res: Response;
    if (fetchResponse === 'throw') throw new Error('Network error');
    res = fetchResponse;

    if (res.ok) {
      localStorageMock.setItem('accountDeleted', 'true');
      await signOut({ redirect: false });
      routerPush('/');
      return { outcome: 'deleted', signOutArgs: { redirect: false }, navigatedTo: '/' };
    }

    const body = await res.json().catch(() => ({}));
    if (res.status === 401 || (body as any).code === 'UNAUTHORIZED') {
      return { outcome: 'wrong-password', passwordError: 'Incorrect password' };
    }
    const msg = (body as any).message || 'Account deletion failed. Please try again.';
    toastError(msg);
    return { outcome: 'backend-error', toastMessage: msg };
  } catch {
    const msg = 'Network error — account not deleted.';
    toastError(msg);
    return { outcome: 'network-error', toastMessage: msg };
  }
}

// ---------------------------------------------------------------------------
// Simulate the notification poll check (mirrors useNotifications.tsx)
// ---------------------------------------------------------------------------

async function simulateNotificationPollCheck(opts: {
  isHidden: boolean;
  isFetching: boolean;
  fetch: () => Promise<Response>;
}): Promise<'skipped:hidden' | 'skipped:fetching' | 'skipped:deleted' | 'polled'> {
  if (opts.isHidden) return 'skipped:hidden';
  if (opts.isFetching) return 'skipped:fetching';
  if (localStorageMock.getItem('accountDeleted') === 'true') return 'skipped:deleted';
  await opts.fetch();
  return 'polled';
}

// ---------------------------------------------------------------------------
// Simulate useMatching 401 handler (mirrors all 4 locations in useMatching.ts)
// ---------------------------------------------------------------------------

function simulateMatchingOn401(opts: {
  signOut: (args: object) => void;
}): 'signed-out' | 'skipped:deleted' {
  if (localStorageMock.getItem('accountDeleted') !== 'true') {
    opts.signOut({ redirect: true, callbackUrl: '/login' });
    return 'signed-out';
  }
  return 'skipped:deleted';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => { localStorageMock.clear(); });
afterEach(() => { vi.restoreAllMocks(); });

// ---------------------------------------------------------------------------
// 1. Successful deletion flow
// ---------------------------------------------------------------------------

describe('successful deletion', () => {
  it('sets accountDeleted flag, calls signOut({ redirect: false }), navigates to /', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    const routerPush = vi.fn();
    const toastError = vi.fn();

    const result = await simulateHandleDeleteAccount({
      authProvider: 'EMAIL',
      password: 'correct-password',
      fetchResponse: makeResponse(200, {}),
      signOut, routerPush, toastError,
    });

    expect(result.outcome).toBe('deleted');
    if (result.outcome === 'deleted') {
      expect(result.signOutArgs).toEqual({ redirect: false });
      expect(result.navigatedTo).toBe('/');
    }
    expect(localStorageMock.getItem('accountDeleted')).toBe('true');
    expect(signOut).toHaveBeenCalledOnce();
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(routerPush).toHaveBeenCalledWith('/');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('SPOTIFY user: sets flag and navigates to /', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    const routerPush = vi.fn();

    const result = await simulateHandleDeleteAccount({
      authProvider: 'SPOTIFY',
      deleteConfirmText: 'DELETE',
      fetchResponse: makeResponse(200, {}),
      signOut, routerPush, toastError: vi.fn(),
    });

    expect(result.outcome).toBe('deleted');
    expect(localStorageMock.getItem('accountDeleted')).toBe('true');
    expect(routerPush).toHaveBeenCalledWith('/');
  });
});

// ---------------------------------------------------------------------------
// 2. Failed deletion — flag must NOT be set
// ---------------------------------------------------------------------------

describe('failed deletion — flag not set', () => {
  it('wrong password: does not set flag, returns password error', async () => {
    const signOut = vi.fn();
    const routerPush = vi.fn();

    const result = await simulateHandleDeleteAccount({
      authProvider: 'EMAIL',
      password: 'wrong-password',
      fetchResponse: makeResponse(401, { code: 'UNAUTHORIZED', message: 'Bad credentials' }),
      signOut, routerPush, toastError: vi.fn(),
    });

    expect(result.outcome).toBe('wrong-password');
    expect(localStorageMock.getItem('accountDeleted')).toBeNull();
    expect(signOut).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('backend error (500): does not set flag, shows toast', async () => {
    const signOut = vi.fn();
    const routerPush = vi.fn();
    const toastError = vi.fn();

    const result = await simulateHandleDeleteAccount({
      authProvider: 'EMAIL',
      password: 'some-password',
      fetchResponse: makeResponse(500, { message: 'Internal server error' }),
      signOut, routerPush, toastError,
    });

    expect(result.outcome).toBe('backend-error');
    expect(localStorageMock.getItem('accountDeleted')).toBeNull();
    expect(toastError).toHaveBeenCalledWith('Internal server error');
    expect(signOut).not.toHaveBeenCalled();
  });

  it('network error: does not set flag, shows toast', async () => {
    const signOut = vi.fn();
    const routerPush = vi.fn();
    const toastError = vi.fn();

    const result = await simulateHandleDeleteAccount({
      authProvider: 'EMAIL',
      password: 'some-password',
      fetchResponse: 'throw',
      signOut, routerPush, toastError,
    });

    expect(result.outcome).toBe('network-error');
    expect(localStorageMock.getItem('accountDeleted')).toBeNull();
    expect(signOut).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. Notification poll is suppressed by the flag
// ---------------------------------------------------------------------------

describe('notification polling suppression', () => {
  it('poll fires normally when flag is absent', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(200, { matches: [] }));
    const outcome = await simulateNotificationPollCheck({
      isHidden: false, isFetching: false, fetch: fetchMock,
    });
    expect(outcome).toBe('polled');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('poll is skipped when accountDeleted flag is set', async () => {
    localStorageMock.setItem('accountDeleted', 'true');
    const fetchMock = vi.fn();
    const outcome = await simulateNotificationPollCheck({
      isHidden: false, isFetching: false, fetch: fetchMock,
    });
    expect(outcome).toBe('skipped:deleted');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('poll is still skipped when hidden (existing guard unaffected)', async () => {
    const fetchMock = vi.fn();
    const outcome = await simulateNotificationPollCheck({
      isHidden: true, isFetching: false, fetch: fetchMock,
    });
    expect(outcome).toBe('skipped:hidden');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. useMatching 401 handler respects the flag
// ---------------------------------------------------------------------------

describe('useMatching 401 handler', () => {
  it('calls signOut when flag is absent (normal expired session)', () => {
    const signOut = vi.fn();
    const outcome = simulateMatchingOn401({ signOut });
    expect(outcome).toBe('signed-out');
    expect(signOut).toHaveBeenCalledWith({ redirect: true, callbackUrl: '/login' });
  });

  it('skips signOut when accountDeleted flag is set', () => {
    localStorageMock.setItem('accountDeleted', 'true');
    const signOut = vi.fn();
    const outcome = simulateMatchingOn401({ signOut });
    expect(outcome).toBe('skipped:deleted');
    expect(signOut).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 5. Concurrent race scenario
// ---------------------------------------------------------------------------

describe('concurrent race: deletion vs in-flight poll', () => {
  it('poll started before deletion completes is suppressed by the flag', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    const routerPush = vi.fn();
    let resolveSlowFetch!: (r: Response) => void;
    const slowFetchPromise = new Promise<Response>((res) => { resolveSlowFetch = res; });

    // Start a slow poll (simulates a poll already in-flight when deletion fires)
    const pollPromise = simulateNotificationPollCheck({
      isHidden: false,
      isFetching: false,
      fetch: () => slowFetchPromise,
    });

    // Deletion fires and completes (sets the flag)
    await simulateHandleDeleteAccount({
      authProvider: 'SPOTIFY',
      deleteConfirmText: 'DELETE',
      fetchResponse: makeResponse(200, {}),
      signOut, routerPush, toastError: vi.fn(),
    });

    expect(localStorageMock.getItem('accountDeleted')).toBe('true');

    // Now resolve the slow poll — but the check already passed the guard before
    // the flag was set, so it will complete (this is the expected behavior:
    // the guard stops NEW polls, not already-started ones — the in-flight poll
    // resolves harmlessly because it only sets hasNewMatch, never calls signOut)
    resolveSlowFetch(makeResponse(200, { matches: [] }));
    const pollOutcome = await pollPromise;
    expect(pollOutcome).toBe('polled'); // started before flag, runs to completion

    // A NEW poll after deletion is blocked
    const newPollFetch = vi.fn();
    const newPollOutcome = await simulateNotificationPollCheck({
      isHidden: false, isFetching: false, fetch: newPollFetch,
    });
    expect(newPollOutcome).toBe('skipped:deleted');
    expect(newPollFetch).not.toHaveBeenCalled();
  });

  it('useMatching 401 from an in-flight request after deletion does not redirect to /login', () => {
    // Deletion completes and sets the flag
    localStorageMock.setItem('accountDeleted', 'true');

    // An in-flight useMatching request resolves with 401 (dead token)
    const signOut = vi.fn();
    const outcome = simulateMatchingOn401({ signOut });

    // signOut must NOT fire — the settings page already called signOut({ redirect: false })
    // and router.push('/'); a second signOut({ redirect: true }) would race to /login
    expect(outcome).toBe('skipped:deleted');
    expect(signOut).not.toHaveBeenCalled();
  });
});
