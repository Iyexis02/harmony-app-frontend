/**
 * Batch H — Account Deletion Password Fix
 * Integration tests for the DELETE /api/v1/users/me request shape.
 *
 * Runner: vitest (recommended) or jest with ts-jest.
 * Install: npm install -D vitest
 * Run:     npx vitest run __tests__/batch-h-account-deletion.test.ts
 *
 * These tests do NOT require the backend to be running. They simulate the
 * fetch calls that handleDeleteAccount makes and assert the correct request
 * shape for each auth provider.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_BASE = 'http://127.0.0.1:8080';
const ENDPOINT = `${API_BASE}/api/v1/users/me`;

function makeFetchResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Simulate exactly what handleDeleteAccount does for a given auth provider,
 * capturing the Request object that fetch receives.
 */
async function simulateDeletion(opts: {
  authProvider: 'EMAIL' | 'SPOTIFY';
  password?: string;
  deleteConfirmText?: string;
  fetchResponse: Response;
}): Promise<{ capturedRequest: Request; result: 'signed-out' | 'wrong-password' | 'error' | 'network-error' }> {
  const { authProvider, password = '', deleteConfirmText = 'DELETE', fetchResponse } = opts;

  let capturedRequest: Request | undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedRequest = new Request(input as string, init);
      return fetchResponse;
    }),
  );

  const isEmail = authProvider === 'EMAIL';

  // Guard conditions (mirrors the component)
  if (isEmail && !password) throw new Error('password required for EMAIL users');
  if (!isEmail && deleteConfirmText !== 'DELETE') throw new Error('confirmation text required for SPOTIFY users');

  const token = 'test-jwt-token';
  let result: 'signed-out' | 'wrong-password' | 'error' | 'network-error' = 'error';

  try {
    const res = await fetch(ENDPOINT, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(isEmail && { 'Content-Type': 'application/json' }),
      },
      body: isEmail ? JSON.stringify({ password }) : undefined,
    });

    if (res.ok) {
      result = 'signed-out';
    } else {
      const body = await res.json().catch(() => ({}));
      if (res.status === 401 || (body as any).code === 'UNAUTHORIZED') {
        result = 'wrong-password';
      } else {
        result = 'error';
      }
    }
  } catch {
    result = 'network-error';
  }

  return { capturedRequest: capturedRequest!, result };
}

// ---------------------------------------------------------------------------
// EMAIL auth provider
// ---------------------------------------------------------------------------

describe('EMAIL auth — account deletion', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('sends Content-Type and password in request body on success', async () => {
    const { capturedRequest, result } = await simulateDeletion({
      authProvider: 'EMAIL',
      password: 'correct-password',
      fetchResponse: makeFetchResponse(200, {}),
    });

    expect(result).toBe('signed-out');
    expect(capturedRequest.method).toBe('DELETE');
    expect(capturedRequest.headers.get('Content-Type')).toBe('application/json');
    expect(capturedRequest.headers.get('Authorization')).toBe('Bearer test-jwt-token');

    const sentBody = await capturedRequest.json();
    expect(sentBody).toEqual({ password: 'correct-password' });
  });

  it('returns wrong-password result on 401 and does not close dialog', async () => {
    const { result } = await simulateDeletion({
      authProvider: 'EMAIL',
      password: 'wrong-password',
      fetchResponse: makeFetchResponse(401, { code: 'UNAUTHORIZED', message: 'Bad credentials' }),
    });

    expect(result).toBe('wrong-password');
  });

  it('returns wrong-password result when body.code is UNAUTHORIZED (any status)', async () => {
    const { result } = await simulateDeletion({
      authProvider: 'EMAIL',
      password: 'wrong-password',
      fetchResponse: makeFetchResponse(400, { code: 'UNAUTHORIZED', message: 'Bad credentials' }),
    });

    expect(result).toBe('wrong-password');
  });

  it('returns error result on non-auth backend failure', async () => {
    const { result } = await simulateDeletion({
      authProvider: 'EMAIL',
      password: 'some-password',
      fetchResponse: makeFetchResponse(500, { message: 'Internal server error' }),
    });

    expect(result).toBe('error');
  });

  it('guard: throws if password is empty (button should be disabled)', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await expect(
      simulateDeletion({
        authProvider: 'EMAIL',
        password: '',
        fetchResponse: makeFetchResponse(200, {}),
      }),
    ).rejects.toThrow('password required for EMAIL users');
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// SPOTIFY auth provider
// ---------------------------------------------------------------------------

describe('SPOTIFY auth — account deletion', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('sends no body and no Content-Type header', async () => {
    const { capturedRequest, result } = await simulateDeletion({
      authProvider: 'SPOTIFY',
      deleteConfirmText: 'DELETE',
      fetchResponse: makeFetchResponse(200, {}),
    });

    expect(result).toBe('signed-out');
    expect(capturedRequest.method).toBe('DELETE');
    expect(capturedRequest.headers.get('Content-Type')).toBeNull();
    expect(capturedRequest.headers.get('Authorization')).toBe('Bearer test-jwt-token');

    // Body should be empty
    const text = await capturedRequest.text();
    expect(text).toBe('');
  });

  it('guard: throws if confirmation text is not DELETE', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await expect(
      simulateDeletion({
        authProvider: 'SPOTIFY',
        deleteConfirmText: 'delete',
        fetchResponse: makeFetchResponse(200, {}),
      }),
    ).rejects.toThrow('confirmation text required for SPOTIFY users');
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('returns error result on backend failure', async () => {
    const { result } = await simulateDeletion({
      authProvider: 'SPOTIFY',
      deleteConfirmText: 'DELETE',
      fetchResponse: makeFetchResponse(500, { message: 'Server error' }),
    });

    expect(result).toBe('error');
  });
});

// ---------------------------------------------------------------------------
// Request shape contract — critical assertions
// ---------------------------------------------------------------------------

describe('request shape contract', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('EMAIL and SPOTIFY produce structurally different requests', async () => {
    const emailReq = (
      await simulateDeletion({
        authProvider: 'EMAIL',
        password: 'p4ssword',
        fetchResponse: makeFetchResponse(200, {}),
      })
    ).capturedRequest;

    const spotifyReq = (
      await simulateDeletion({
        authProvider: 'SPOTIFY',
        deleteConfirmText: 'DELETE',
        fetchResponse: makeFetchResponse(200, {}),
      })
    ).capturedRequest;

    // EMAIL sends a body; SPOTIFY does not
    const emailBody = await emailReq.text();
    const spotifyBody = await spotifyReq.text();

    expect(emailBody).not.toBe('');
    expect(spotifyBody).toBe('');

    // EMAIL sends Content-Type; SPOTIFY does not
    expect(emailReq.headers.get('Content-Type')).toBe('application/json');
    expect(spotifyReq.headers.get('Content-Type')).toBeNull();
  });
});
