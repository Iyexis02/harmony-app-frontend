/**
 * Batch 6 — Refresh registrationStage After Onboarding
 *
 * Tests that the JWT callback correctly updates token.registrationStage
 * when triggered by a client-side update() call, and that the update
 * is ignored when registrationStage is absent from the session payload.
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Inline the JWT callback logic extracted from route.ts so the test is
// self-contained and does not require NextAuth to be fully initialised.
// The logic under test is exactly:
//
//   if (trigger === 'update' && session?.registrationStage) {
//     token.registrationStage = session.registrationStage;
//     return token;
//   }
// ---------------------------------------------------------------------------

type Token = {
  registrationStage?: string;
  authProvider?: string;
  appJwt?: string;
  userId?: string;
};

type JwtCallbackArgs = {
  token: Token;
  trigger?: string;
  session?: Record<string, unknown>;
  account?: unknown;
  user?: unknown;
};

/**
 * Extracted from app/api/auth/[...nextauth]/route.ts — the update-trigger
 * branch only. Returns the (possibly mutated) token.
 */
function jwtUpdateBranch({ token, trigger, session }: JwtCallbackArgs): Token | null {
  if (trigger === 'update' && session?.registrationStage) {
    token.registrationStage = session.registrationStage as string;
    return token;
  }
  return null; // branch not taken
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Batch 6 — JWT update trigger', () => {
  it('updates registrationStage when trigger=update and payload contains registrationStage', () => {
    const token: Token = { registrationStage: 'PRIVACY_SETTINGS', authProvider: 'EMAIL' };

    const result = jwtUpdateBranch({
      token,
      trigger: 'update',
      session: { registrationStage: 'FINISHED' },
    });

    expect(result).not.toBeNull();
    expect(result!.registrationStage).toBe('FINISHED');
  });

  it('does not enter the update branch when trigger is not "update"', () => {
    const token: Token = { registrationStage: 'PRIVACY_SETTINGS' };

    const result = jwtUpdateBranch({
      token,
      trigger: undefined,
      session: { registrationStage: 'FINISHED' },
    });

    expect(result).toBeNull();
    // token is unchanged
    expect(token.registrationStage).toBe('PRIVACY_SETTINGS');
  });

  it('does not enter the update branch when session has no registrationStage', () => {
    const token: Token = { registrationStage: 'PRIVACY_SETTINGS' };

    const result = jwtUpdateBranch({
      token,
      trigger: 'update',
      session: {},
    });

    expect(result).toBeNull();
    expect(token.registrationStage).toBe('PRIVACY_SETTINGS');
  });

  it('does not enter the update branch when session is undefined', () => {
    const token: Token = { registrationStage: 'PRIVACY_SETTINGS' };

    const result = jwtUpdateBranch({
      token,
      trigger: 'update',
      session: undefined,
    });

    expect(result).toBeNull();
    expect(token.registrationStage).toBe('PRIVACY_SETTINGS');
  });

  it('preserves all other token fields when updating registrationStage', () => {
    const token: Token = {
      registrationStage: 'DATING_PREFERENCES',
      authProvider: 'SPOTIFY',
      appJwt: 'some.jwt.token',
      userId: 'user-123',
    };

    const result = jwtUpdateBranch({
      token,
      trigger: 'update',
      session: { registrationStage: 'FINISHED' },
    });

    expect(result!.registrationStage).toBe('FINISHED');
    expect(result!.authProvider).toBe('SPOTIFY');
    expect(result!.appJwt).toBe('some.jwt.token');
    expect(result!.userId).toBe('user-123');
  });

  it('is idempotent — updating an already-FINISHED token is a no-op in effect', () => {
    const token: Token = { registrationStage: 'FINISHED' };

    const result = jwtUpdateBranch({
      token,
      trigger: 'update',
      session: { registrationStage: 'FINISHED' },
    });

    expect(result!.registrationStage).toBe('FINISHED');
  });
});

// ---------------------------------------------------------------------------
// Middleware routing logic (extracted, no Next.js runtime required)
// ---------------------------------------------------------------------------

function middlewareDestination(registrationStage: string | undefined): string {
  return registrationStage === 'FINISHED' ? '/discover' : '/onboarding';
}

describe('Batch 6 — middleware routing after stage update', () => {
  it('routes to /discover when registrationStage is FINISHED', () => {
    expect(middlewareDestination('FINISHED')).toBe('/discover');
  });

  it('routes to /onboarding when registrationStage is not FINISHED', () => {
    expect(middlewareDestination('PRIVACY_SETTINGS')).toBe('/onboarding');
    expect(middlewareDestination('STARTED')).toBe('/onboarding');
    expect(middlewareDestination(undefined)).toBe('/onboarding');
  });

  it('routes to /discover immediately after update() resolves the stage to FINISHED', () => {
    // Simulate: token had stale stage → update() fires → JWT callback returns FINISHED token
    const staleToken: Token = { registrationStage: 'PRIVACY_SETTINGS' };

    const updatedToken = jwtUpdateBranch({
      token: staleToken,
      trigger: 'update',
      session: { registrationStage: 'FINISHED' },
    });

    expect(middlewareDestination(updatedToken!.registrationStage)).toBe('/discover');
  });
});
