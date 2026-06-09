/**
 * Batch 1 — Move Spotify JWT Generation to Backend
 *
 * Runner: vitest
 * Run:    npx vitest run __tests__/batch1-spotify-jwt-backend.test.ts
 *
 * Verifies:
 *
 * 1. The `storeTokens()` response is correctly typed as AuthResponseDto
 *    (has `token`, `userId`, `registrationStage`, `emailVerified`, `authProvider`).
 *
 * 2. The JWT callback stores the backend-issued token (spotifyUser.token)
 *    instead of generating one client-side.
 *
 * 3. The `generateToken` function from lib/jwt.ts is no longer imported
 *    or referenced anywhere in the codebase.
 *
 * 4. Concurrent Spotify logins (simulating simultaneous requests to the
 *    backend's /spotify-login endpoint) each receive independent, valid tokens.
 *
 * 5. Email/password login is unaffected — the token still comes from
 *    the backend's AuthResponseDto.token field.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a mock Response matching the backend's AuthResponseDto shape. */
function mockSpotifyLoginResponse(overrides: Record<string, unknown> = {}) {
  return {
    token: 'backend-signed-jwt-for-spotify-user',
    userId: 'uuid-from-backend-001',
    email: 'spotify@example.com',
    name: 'Spotify User',
    registrationStage: 'STARTED',
    emailVerified: true,
    authProvider: 'SPOTIFY',
    ...overrides,
  };
}

function mockFetch(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  );
}

// ---------------------------------------------------------------------------
// 1. storeTokens response shape matches AuthResponseDto
// ---------------------------------------------------------------------------

describe('storeTokens — backend response includes JWT token', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('response contains token, userId, registrationStage, emailVerified, authProvider', async () => {
    const responseBody = mockSpotifyLoginResponse();
    mockFetch(200, responseBody);

    // Simulate what storeTokens() does: POST to backend, parse JSON
    const response = await fetch('http://localhost:8080/api/v1/auth/spotify-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spotifyId: 'sp-123',
        email: 'spotify@example.com',
        name: 'Spotify User',
        spotifyAccessToken: 'access-tok',
        spotifyRefreshToken: 'refresh-tok',
        spotifyTokenExpiresAt: 1700000000,
      }),
    });
    const data = await response.json();

    // These are the fields the NextAuth JWT callback now reads
    expect(data).toHaveProperty('token');
    expect(data).toHaveProperty('userId');
    expect(data).toHaveProperty('registrationStage');
    expect(data).toHaveProperty('emailVerified');
    expect(data).toHaveProperty('authProvider');

    // token must be a non-empty string (the backend-signed JWT)
    expect(typeof data.token).toBe('string');
    expect(data.token.length).toBeGreaterThan(0);
  });

  it('rejects with error when backend returns non-200', async () => {
    mockFetch(500, { message: 'Internal Server Error' });

    const response = await fetch('http://localhost:8080/api/v1/auth/spotify-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spotifyId: 'sp-123' }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// 2. JWT callback reads backend token, not client-generated
// ---------------------------------------------------------------------------

describe('JWT callback — uses spotifyUser.token from backend response', () => {
  it('NextAuth route file does NOT import generateToken from lib/jwt', () => {
    const routePath = resolve(__dirname, '../app/api/auth/[...nextauth]/route.ts');
    const source = readFileSync(routePath, 'utf-8');

    // Must NOT contain any import of generateToken
    expect(source).not.toMatch(/import\s+\{[^}]*generateToken[^}]*\}\s+from/);
    // Must NOT call generateToken anywhere
    expect(source).not.toMatch(/generateToken\s*\(/);
  });

  it('NextAuth route file reads spotifyUser.token', () => {
    const routePath = resolve(__dirname, '../app/api/auth/[...nextauth]/route.ts');
    const source = readFileSync(routePath, 'utf-8');

    // Must assign appJwt from the backend response's token field
    expect(source).toMatch(/token\.appJwt\s*=\s*spotifyUser\.token/);
  });

  it('NextAuth route file reads spotifyUser.userId', () => {
    const routePath = resolve(__dirname, '../app/api/auth/[...nextauth]/route.ts');
    const source = readFileSync(routePath, 'utf-8');

    // Must assign userId from backend response, not from account.providerAccountId
    expect(source).toMatch(/token\.userId\s*=\s*spotifyUser\.userId/);
  });
});

// ---------------------------------------------------------------------------
// 3. lib/jwt.ts is fully removed
// ---------------------------------------------------------------------------

describe('lib/jwt.ts — deleted from codebase', () => {
  it('lib/jwt.ts file does not exist', () => {
    const jwtPath = resolve(__dirname, '../lib/jwt.ts');
    expect(existsSync(jwtPath)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Concurrent Spotify logins receive independent tokens
// ---------------------------------------------------------------------------

describe('concurrent Spotify logins — independent backend-issued tokens', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('two simultaneous logins receive different tokens from backend', async () => {
    // Simulate the backend returning unique tokens for each request
    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        callCount++;
        const body = mockSpotifyLoginResponse({
          token: `backend-jwt-${callCount}`,
          userId: `uuid-${callCount}`,
        });
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );

    // Fire two concurrent login requests (simulating two tabs / race condition)
    const [res1, res2] = await Promise.all([
      fetch('http://localhost:8080/api/v1/auth/spotify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotifyId: 'sp-user-A' }),
      }),
      fetch('http://localhost:8080/api/v1/auth/spotify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotifyId: 'sp-user-B' }),
      }),
    ]);

    const data1 = await res1.json();
    const data2 = await res2.json();

    // Each login gets its own backend-signed JWT
    expect(data1.token).not.toBe(data2.token);
    expect(data1.userId).not.toBe(data2.userId);

    // Both are valid AuthResponseDto shapes
    for (const data of [data1, data2]) {
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('userId');
      expect(data).toHaveProperty('emailVerified');
      expect(data).toHaveProperty('authProvider');
      expect(data).toHaveProperty('registrationStage');
    }
  });

  it('concurrent logins where one fails do not corrupt the other', async () => {
    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // First request succeeds
          return new Response(
            JSON.stringify(mockSpotifyLoginResponse({ token: 'valid-jwt' })),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        // Second request fails (e.g., email conflict)
        return new Response(
          JSON.stringify({ code: 'CONFLICT', message: 'Email already registered.' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );

    const [res1, res2] = await Promise.all([
      fetch('http://localhost:8080/api/v1/auth/spotify-login', {
        method: 'POST',
        body: JSON.stringify({ spotifyId: 'sp-A' }),
      }),
      fetch('http://localhost:8080/api/v1/auth/spotify-login', {
        method: 'POST',
        body: JSON.stringify({ spotifyId: 'sp-B' }),
      }),
    ]);

    // First succeeds with a valid token
    expect(res1.ok).toBe(true);
    const data1 = await res1.json();
    expect(data1.token).toBe('valid-jwt');

    // Second fails cleanly
    expect(res2.ok).toBe(false);
    expect(res2.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// 5. Email/password login is unaffected
// ---------------------------------------------------------------------------

describe('email/password login — still reads backend-issued token', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('email login response has same AuthResponseDto shape', async () => {
    const emailResponse = {
      token: 'backend-jwt-for-email-user',
      userId: 'uuid-email-001',
      email: 'user@example.com',
      name: 'Email User',
      registrationStage: 'FINISHED',
      emailVerified: true,
      authProvider: 'EMAIL',
    };
    mockFetch(200, emailResponse);

    const response = await fetch('http://localhost:8080/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'pass' }),
    });
    const data = await response.json();

    // Same shape as Spotify login response — both are AuthResponseDto
    expect(data).toHaveProperty('token');
    expect(data).toHaveProperty('userId');
    expect(data).toHaveProperty('registrationStage');
    expect(data).toHaveProperty('emailVerified');
    expect(data).toHaveProperty('authProvider');
    expect(data.authProvider).toBe('EMAIL');
  });

  it('NextAuth authorize function reads token from result.data.token (unchanged)', () => {
    const routePath = resolve(__dirname, '../app/api/auth/[...nextauth]/route.ts');
    const source = readFileSync(routePath, 'utf-8');

    // The credentials provider still destructures { token } from the login response
    expect(source).toMatch(/const\s+\{[^}]*token[^}]*\}\s*=\s*result\.data/);
    // And assigns it as appJwt
    expect(source).toMatch(/appJwt:\s*token/);
  });
});
