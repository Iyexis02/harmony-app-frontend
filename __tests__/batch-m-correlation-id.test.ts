/**
 * Batch M — X-Correlation-Id Support
 *
 * Verifies that:
 * 1. Every request (public + authenticated) sends a generated X-Correlation-Id header.
 * 2. Each concurrent request gets its own unique ID (no shared-state race condition).
 * 3. The server-echoed ID is captured and attached to ApiError on failures.
 * 4. When the server does not echo the header, the client-generated ID is used as fallback.
 * 5. 500 errors embed a short ID (first 8 chars) in the error message.
 * 6. console.error is called with the correlationId on every non-2xx response.
 * 7. Success responses do not surface correlationId (it lives only on errors).
 * 8. Network errors carry a correlationId so even offline failures are traceable.
 *
 * Run with: npx vitest run __tests__/batch-m-correlation-id.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --------------------------------------------------------------------------
// Globals — crypto.randomUUID is available in Node 19+; polyfill for older.
// --------------------------------------------------------------------------
if (typeof globalThis.crypto === 'undefined') {
  // @ts-expect-error polyfill
  globalThis.crypto = { randomUUID: () => require('node:crypto').randomUUID() };
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

// A hex UUID so its first 8 chars satisfy the "(Error ID: [0-9a-f-]{8})" assertion,
// matching what a real server-echoed correlation id looks like.
const SERVER_CORRELATION_ID = 'abcd1234-5678-4abc-8def-1234567890ab';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function makeFetchMock(
  status: number,
  body: object | null,
  opts: { echoCorrelationId?: boolean; echoWith?: string } = {}
) {
  return vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    statusText: 'Internal Server Error',
    headers: {
      get: (name: string) => {
        if (name === 'X-Correlation-Id') {
          if (opts.echoCorrelationId) return opts.echoWith ?? SERVER_CORRELATION_ID;
          return null;
        }
        if (name === 'Retry-After') return null;
        return null;
      },
    },
    json: () => Promise.resolve(body),
  });
}

// --------------------------------------------------------------------------
// Setup / teardown
// --------------------------------------------------------------------------

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

// --------------------------------------------------------------------------
// 1. Outbound header — apiRequest
// --------------------------------------------------------------------------

describe('apiRequest — outbound X-Correlation-Id header', () => {
  it('attaches a UUID as X-Correlation-Id on every request', async () => {
    const mockFetch = makeFetchMock(200, { hello: 'world' });
    vi.stubGlobal('fetch', mockFetch);

    const { apiRequest } = await import('@/lib/api');
    await apiRequest('/test');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const sentId = (init.headers as Record<string, string>)['X-Correlation-Id'];
    expect(sentId).toMatch(UUID_REGEX);
  });

  it('attaches a UUID as X-Correlation-Id on authenticated requests', async () => {
    const mockFetch = makeFetchMock(200, { hello: 'world' });
    vi.stubGlobal('fetch', mockFetch);

    const { authenticatedApiRequest } = await import('@/lib/api');
    await authenticatedApiRequest('/test', 'token-abc');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const sentId = (init.headers as Record<string, string>)['X-Correlation-Id'];
    expect(sentId).toMatch(UUID_REGEX);
  });
});

// --------------------------------------------------------------------------
// 2. Concurrent requests — unique IDs per request
// --------------------------------------------------------------------------

describe('concurrent requests — each gets a unique X-Correlation-Id', () => {
  it('N simultaneous apiRequest calls all send different IDs', async () => {
    const capturedIds: string[] = [];

    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      capturedIds.push((init.headers as Record<string, string>)['X-Correlation-Id']);
      return Promise.resolve({
        status: 200,
        ok: true,
        headers: { get: () => null },
        json: () => Promise.resolve({}),
      });
    }));

    const { apiRequest } = await import('@/lib/api');
    const CONCURRENCY = 20;
    await Promise.all(Array.from({ length: CONCURRENCY }, () => apiRequest('/test')));

    expect(capturedIds).toHaveLength(CONCURRENCY);
    const unique = new Set(capturedIds);
    expect(unique.size).toBe(CONCURRENCY);
    capturedIds.forEach((id) => expect(id).toMatch(UUID_REGEX));
  });

  it('N simultaneous authenticatedApiRequest calls all send different IDs', async () => {
    const capturedIds: string[] = [];

    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      capturedIds.push((init.headers as Record<string, string>)['X-Correlation-Id']);
      return Promise.resolve({
        status: 200,
        ok: true,
        headers: { get: () => null },
        json: () => Promise.resolve({}),
      });
    }));

    const { authenticatedApiRequest } = await import('@/lib/api');
    const CONCURRENCY = 20;
    await Promise.all(
      Array.from({ length: CONCURRENCY }, (_, i) => authenticatedApiRequest('/test', `token-${i}`))
    );

    expect(capturedIds).toHaveLength(CONCURRENCY);
    const unique = new Set(capturedIds);
    expect(unique.size).toBe(CONCURRENCY);
  });

  it('concurrent errors each carry their own correlationId (no bleed-over)', async () => {
    const sentIds: string[] = [];

    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const id = (init.headers as Record<string, string>)['X-Correlation-Id'];
      sentIds.push(id);
      return Promise.resolve({
        status: 400,
        ok: false,
        statusText: 'Bad Request',
        headers: { get: (name: string) => (name === 'X-Correlation-Id' ? id : null) },
        json: () => Promise.resolve({ message: 'bad', code: 'INVALID_ARGUMENT' }),
      });
    }));

    const { apiRequest } = await import('@/lib/api');
    const results = await Promise.all(
      Array.from({ length: 10 }, () => apiRequest<never>('/test'))
    );

    const errorIds = results.map((r) => (!r.ok ? r.error.correlationId : null));
    const unique = new Set(errorIds);
    expect(unique.size).toBe(10);
    // Each error's correlationId matches what was sent for that request
    errorIds.forEach((id, i) => expect(id).toBe(sentIds[i]));
  });
});

// --------------------------------------------------------------------------
// 3. Server-echoed ID is preferred over client-generated ID
// --------------------------------------------------------------------------

describe('parseResponse — uses server-echoed X-Correlation-Id', () => {
  it('error carries the server-echoed ID when the server echoes it back', async () => {
    vi.stubGlobal('fetch', makeFetchMock(400, { message: 'oops', code: 'INVALID_ARGUMENT' }, { echoCorrelationId: true }));

    const { apiRequest } = await import('@/lib/api');
    const result = await apiRequest<never>('/test');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.correlationId).toBe(SERVER_CORRELATION_ID);
    }
  });

  it('error falls back to client-generated ID when server does not echo', async () => {
    const sentIds: string[] = [];
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      sentIds.push((init.headers as Record<string, string>)['X-Correlation-Id']);
      return Promise.resolve({
        status: 400,
        ok: false,
        statusText: 'Bad Request',
        headers: { get: () => null }, // server does NOT echo the header
        json: () => Promise.resolve({ message: 'oops', code: 'INVALID_ARGUMENT' }),
      });
    }));

    const { apiRequest } = await import('@/lib/api');
    const result = await apiRequest<never>('/test');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.correlationId).toBe(sentIds[0]);
      expect(result.error.correlationId).toMatch(UUID_REGEX);
    }
  });
});

// --------------------------------------------------------------------------
// 4. 500 errors embed short ID in the message
// --------------------------------------------------------------------------

describe('500 errors — short ID in message', () => {
  it('appends "(Error ID: XXXXXXXX)" to the message', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock(500, { message: 'Something went wrong', code: 'INTERNAL_ERROR' }, { echoCorrelationId: true })
    );

    const { apiRequest } = await import('@/lib/api');
    const result = await apiRequest<never>('/test');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Error ID:');
      expect(result.error.message).toContain(SERVER_CORRELATION_ID.slice(0, 8));
      expect(result.error.message).toMatch(/Error ID: [0-9a-f-]{8}/i);
    }
  });

  it('non-500 errors do NOT have the short ID appended to the message', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock(400, { message: 'Bad input', code: 'VALIDATION_ERROR' }, { echoCorrelationId: true })
    );

    const { apiRequest } = await import('@/lib/api');
    const result = await apiRequest<never>('/test');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).not.toContain('Error ID:');
      expect(result.error.message).toBe('Bad input');
    }
  });
});

// --------------------------------------------------------------------------
// 5. console.error is called on every error response
// --------------------------------------------------------------------------

describe('console.error — called with correlationId on errors', () => {
  it('logs correlationId on 4xx', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock(401, { message: 'Unauthorized', code: 'UNAUTHORIZED' }, { echoCorrelationId: true })
    );

    const { apiRequest } = await import('@/lib/api');
    await apiRequest<never>('/test');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(SERVER_CORRELATION_ID),
      expect.objectContaining({ status: 401 })
    );
  });

  it('logs correlationId on 5xx', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock(500, { message: 'Server error', code: 'INTERNAL_ERROR' }, { echoCorrelationId: true })
    );

    const { apiRequest } = await import('@/lib/api');
    await apiRequest<never>('/test');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(SERVER_CORRELATION_ID),
      expect.objectContaining({ status: 500 })
    );
  });

  it('logs correlationId on 429', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 429,
      ok: false,
      statusText: 'Too Many Requests',
      headers: {
        get: (name: string) => {
          if (name === 'X-Correlation-Id') return SERVER_CORRELATION_ID;
          if (name === 'Retry-After') return '30';
          return null;
        },
      },
      json: () => Promise.resolve({}),
    }));

    const { apiRequest } = await import('@/lib/api');
    await apiRequest<never>('/test');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(SERVER_CORRELATION_ID),
      expect.objectContaining({ status: 429 })
    );
  });

  it('does NOT call console.error on 2xx success', async () => {
    vi.stubGlobal('fetch', makeFetchMock(200, { data: 'ok' }, { echoCorrelationId: true }));

    const { apiRequest } = await import('@/lib/api');
    await apiRequest('/test');

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

// --------------------------------------------------------------------------
// 6. Success responses — correlationId not surfaced
// --------------------------------------------------------------------------

describe('success responses — correlationId not in ApiResult', () => {
  it('ok: true result has no correlationId property', async () => {
    vi.stubGlobal('fetch', makeFetchMock(200, { userId: 42 }, { echoCorrelationId: true }));

    const { apiRequest } = await import('@/lib/api');
    const result = await apiRequest<{ userId: number }>('/test');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ userId: 42 });
      // correlationId must not leak into the success shape
      expect('correlationId' in result).toBe(false);
    }
  });
});

// --------------------------------------------------------------------------
// 7. Network errors carry a correlationId
// --------------------------------------------------------------------------

describe('network errors — correlationId still present', () => {
  it('fetch throw produces an error with a correlationId', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const { apiRequest } = await import('@/lib/api');
    const result = await apiRequest<never>('/test');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(0);
      expect(result.error.message).toBe('Network error');
      expect(result.error.correlationId).toMatch(UUID_REGEX);
    }
  });
});
