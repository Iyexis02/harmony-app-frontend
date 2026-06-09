/**
 * Batch D — 403 Email Verification Interceptor
 * Integration tests for lib/api.ts detection logic and the isEmailVerificationError utility.
 *
 * Runner: vitest (recommended) or jest with ts-jest.
 * Install: npm install -D vitest
 * Run:     npx vitest run __tests__/batch-d-email-verification.test.ts
 *
 * These tests do NOT require the backend to be running. They mock globalThis.fetch
 * to simulate exact response shapes that the Spring Boot EmailVerificationFilter
 * and ControllerAdvice produce.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Tested units
import { apiRequest, isEmailVerificationError, EMAIL_VERIFICATION_REQUIRED } from '../lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchResponse(status: number, body: unknown): Response {
  const json = JSON.stringify(body);
  return new Response(json, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeEmptyFetchResponse(status: number): Response {
  return new Response(null, { status });
}

// ---------------------------------------------------------------------------
// isEmailVerificationError — pure utility
// ---------------------------------------------------------------------------

describe('isEmailVerificationError', () => {
  it('returns true when status is 403 and code is EMAIL_VERIFICATION_REQUIRED', () => {
    expect(
      isEmailVerificationError({
        status: 403,
        code: EMAIL_VERIFICATION_REQUIRED,
        message: 'Email verification required',
      })
    ).toBe(true);
  });

  it('returns false when status is 403 but code is a different string', () => {
    expect(
      isEmailVerificationError({
        status: 403,
        code: 'SOME_OTHER_CODE',
        message: 'Access denied',
      })
    ).toBe(false);
  });

  it('returns false when status is 403 and code is undefined', () => {
    expect(
      isEmailVerificationError({ status: 403, code: undefined, message: 'Forbidden' })
    ).toBe(false);
  });

  it('returns false for 401 even with the right code (wrong status)', () => {
    expect(
      isEmailVerificationError({
        status: 401,
        code: EMAIL_VERIFICATION_REQUIRED,
        message: 'Unauthorized',
      })
    ).toBe(false);
  });

  it('returns false for 200', () => {
    expect(
      isEmailVerificationError({ status: 200, code: undefined, message: '' })
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseResponse detection — tested through apiRequest with mocked fetch
// ---------------------------------------------------------------------------

describe('apiRequest — 403 email verification detection', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets EMAIL_VERIFICATION_REQUIRED when body message contains "Email verification"', async () => {
    // Simulates Spring's EmailVerificationFilter: no structured `code` field,
    // raw message string.
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(403, {
        message: 'Email verification required',
        timestamp: '2026-03-22T00:00:00Z',
      })
    );

    const result = await apiRequest('/api/v1/matching/potential');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(403);
      expect(result.error.code).toBe(EMAIL_VERIFICATION_REQUIRED);
    }
  });

  it('does NOT set EMAIL_VERIFICATION_REQUIRED when body code is FORBIDDEN (no email message)', async () => {
    // Batch 14 fix: a 403 with code FORBIDDEN but a non-email-verification message
    // must preserve the original FORBIDDEN code so callers (e.g. getMatchScore,
    // unmatch) can route to the correct error branch.
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(403, {
        code: 'FORBIDDEN',
        message: 'Access denied',
        timestamp: '2026-03-22T00:00:00Z',
      })
    );

    const result = await apiRequest('/api/v1/matching/potential');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(403);
      expect(result.error.code).toBe('FORBIDDEN');
      expect(result.error.code).not.toBe(EMAIL_VERIFICATION_REQUIRED);
    }
  });

  it('sets EMAIL_VERIFICATION_REQUIRED when both conditions are true', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(403, {
        code: 'FORBIDDEN',
        message: 'Email verification required',
        timestamp: '2026-03-22T00:00:00Z',
      })
    );

    const result = await apiRequest('/api/v1/matching/potential');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(EMAIL_VERIFICATION_REQUIRED);
    }
  });

  it('does NOT set EMAIL_VERIFICATION_REQUIRED for a 403 with an unrelated message and no code', async () => {
    // A generic 403 with a completely different message (e.g. IP block, WAF rule)
    // should NOT be mistaken for email verification.
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(403, {
        message: 'Access denied by policy',
        timestamp: '2026-03-22T00:00:00Z',
      })
    );

    const result = await apiRequest('/api/v1/matching/potential');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(403);
      expect(result.error.code).toBeUndefined();
      expect(result.error.code).not.toBe(EMAIL_VERIFICATION_REQUIRED);
    }
  });

  it('does NOT affect 401 responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(401, {
        code: 'UNAUTHORIZED',
        message: 'Invalid token',
        timestamp: '2026-03-22T00:00:00Z',
      })
    );

    const result = await apiRequest('/api/v1/matching/potential');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(401);
      expect(result.error.code).toBe('UNAUTHORIZED');
      expect(result.error.code).not.toBe(EMAIL_VERIFICATION_REQUIRED);
    }
  });

  it('does NOT affect 200 responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(200, { matches: [], hasMore: false })
    );

    const result = await apiRequest<{ matches: unknown[]; hasMore: boolean }>(
      '/api/v1/matching/potential'
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.matches).toEqual([]);
    }
  });

  it('does NOT affect 429 responses (rate limit has its own branch)', async () => {
    const response = new Response(null, {
      status: 429,
      headers: { 'Retry-After': '30' },
    });
    vi.mocked(fetch).mockResolvedValueOnce(response);

    const result = await apiRequest('/api/v1/matching/swipe');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(429);
      expect(result.error.code).toBeUndefined();
    }
  });

  it('preserves existing fields (message, status, fields) alongside the injected code', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(403, {
        message: 'Email verification required',
        fields: null,
        timestamp: '2026-03-22T00:00:00Z',
      })
    );

    const result = await apiRequest('/api/v1/preferences/genres');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Email verification required');
      expect(result.error.status).toBe(403);
      expect(result.error.code).toBe(EMAIL_VERIFICATION_REQUIRED);
      expect(result.error.fields).toBeNull();
    }
  });

  it('detects the REAL filter shape { error: "Email verification required" } (field is `error`, not `message`)', async () => {
    // Confirmed live: the Spring EmailVerificationFilter (a pre-MVC servlet filter)
    // bypasses ControllerAdvice and returns { "error": "Email verification required" }.
    // Before the fix this degraded to message "Unknown error" with code undefined.
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(403, { error: 'Email verification required' })
    );

    const result = await apiRequest('/api/v1/preferences/genres');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(403);
      expect(result.error.code).toBe(EMAIL_VERIFICATION_REQUIRED);
      expect(result.error.message).toBe('Email verification required');
      expect(isEmailVerificationError(result.error)).toBe(true);
    }
  });

  it('surfaces a non-verification `error`-field message instead of "Unknown error"', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(403, { error: 'Access denied by policy' })
    );

    const result = await apiRequest('/api/v1/matching/potential');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Access denied by policy');
      expect(result.error.code).toBeUndefined();
      expect(result.error.code).not.toBe(EMAIL_VERIFICATION_REQUIRED);
    }
  });

  it('handles a 403 with an empty body gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeEmptyFetchResponse(403));

    const result = await apiRequest('/api/v1/matching/potential');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(403);
      // No message content → not detected as email verification
      expect(result.error.code).toBeUndefined();
    }
  });
});
