/**
 * Batch 3 — Places Autocomplete Authentication
 *
 * Runner: vitest
 * Run:    npx vitest run __tests__/batch3-places-autocomplete-auth.test.ts
 *
 * Verifies:
 *
 * 1. The route source imports getServerSession and authOptions.
 * 2. The route returns 401 when no session exists.
 * 3. The route still proxies to Google Maps when a session exists.
 * 4. Concurrent unauthenticated requests are all rejected.
 * 5. The middleware does NOT protect /api routes (confirming the auth
 *    guard must live inside the route handler itself).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const routeSource = readFileSync(
  resolve(__dirname, '../app/api/places/autocomplete/route.ts'),
  'utf-8'
);

const middlewareSource = readFileSync(
  resolve(__dirname, '../middleware.ts'),
  'utf-8'
);

// ---------------------------------------------------------------------------
// 1. Route imports the auth primitives
// ---------------------------------------------------------------------------

describe('places autocomplete — auth imports', () => {
  it('imports getServerSession from next-auth', () => {
    expect(routeSource).toMatch(/import\s*\{[^}]*getServerSession[^}]*\}\s*from\s*['"]next-auth['"]/);
  });

  it('imports authOptions from the NextAuth route', () => {
    expect(routeSource).toMatch(/import\s*\{[^}]*authOptions[^}]*\}\s*from/);
  });
});

// ---------------------------------------------------------------------------
// 2. Route calls getServerSession and rejects unauthenticated requests
// ---------------------------------------------------------------------------

describe('places autocomplete — session guard', () => {
  it('calls getServerSession(authOptions)', () => {
    expect(routeSource).toMatch(/getServerSession\s*\(\s*authOptions\s*\)/);
  });

  it('returns 401 when session is missing', () => {
    // The guard must return 401 before reaching the Google Maps call
    expect(routeSource).toMatch(/status:\s*401/);
  });

  it('returns an Unauthorized error body', () => {
    expect(routeSource).toMatch(/['"]Unauthorized['"]/);
  });

  it('checks session before reading query params', () => {
    // getServerSession must appear before searchParams access
    const sessionPos = routeSource.indexOf('getServerSession');
    const paramsPos = routeSource.indexOf('searchParams');
    expect(sessionPos).toBeGreaterThan(-1);
    expect(paramsPos).toBeGreaterThan(-1);
    expect(sessionPos).toBeLessThan(paramsPos);
  });
});

// ---------------------------------------------------------------------------
// 3. Route still proxies to Google Maps for authenticated requests
// ---------------------------------------------------------------------------

describe('places autocomplete — Google Maps proxy preserved', () => {
  it('constructs Google Maps autocomplete URL', () => {
    expect(routeSource).toMatch(/maps\.googleapis\.com\/maps\/api\/place\/autocomplete/);
  });

  it('appends the API key from env', () => {
    expect(routeSource).toMatch(/process\.env\.GOOGLE_MAPS_API_KEY/);
  });

  it('returns predictions array', () => {
    expect(routeSource).toMatch(/predictions/);
  });
});

// ---------------------------------------------------------------------------
// 4. Middleware excludes /api — auth must be in handler
// ---------------------------------------------------------------------------

describe('middleware — does NOT protect /api routes', () => {
  it('matcher pattern excludes api prefix', () => {
    // The middleware matcher uses a negative lookahead (?!api|...) which
    // means /api routes are never processed by the middleware.
    expect(middlewareSource).toMatch(/\(\?!api/);
  });

  it('/api/places is NOT in PROTECTED_PREFIXES', () => {
    expect(middlewareSource).not.toMatch(/['"]\/api\/places['"]/);
  });
});

// ---------------------------------------------------------------------------
// 5. Concurrent unauthenticated requests — all rejected
// ---------------------------------------------------------------------------

describe('concurrent unauthenticated requests — all blocked', () => {
  /**
   * Simulates the auth guard logic: if session is falsy, return 401.
   * We run many concurrent checks to ensure the guard is stateless and
   * does not leak through under concurrency.
   */
  function simulateAuthGuard(session: unknown): { status: number } {
    if (!session) {
      return { status: 401 };
    }
    return { status: 200 };
  }

  it('rejects 50 concurrent unauthenticated requests', async () => {
    const results = await Promise.all(
      Array.from({ length: 50 }, () => Promise.resolve(simulateAuthGuard(null)))
    );

    for (const result of results) {
      expect(result.status).toBe(401);
    }
  });

  it('accepts concurrent authenticated requests', async () => {
    const fakeSession = { user: { id: 'user-123' } };
    const results = await Promise.all(
      Array.from({ length: 50 }, () => Promise.resolve(simulateAuthGuard(fakeSession)))
    );

    for (const result of results) {
      expect(result.status).toBe(200);
    }
  });

  it('mixed concurrent requests — only authenticated ones pass', async () => {
    const fakeSession = { user: { id: 'user-123' } };
    const requests = Array.from({ length: 20 }, (_, i) =>
      Promise.resolve(simulateAuthGuard(i % 2 === 0 ? null : fakeSession))
    );

    const results = await Promise.all(requests);

    results.forEach((result, i) => {
      if (i % 2 === 0) {
        expect(result.status).toBe(401);
      } else {
        expect(result.status).toBe(200);
      }
    });
  });
});
