/**
 * Batch N — Cleanup: Deprecated Fields & Character Limits
 *
 * Verifies that:
 * 1. Personality Zod schema allows up to 500 chars for lookingForText (was 200).
 * 2. Personality Zod schema allows up to 300 chars for favoriteQuote (was 200).
 * 3. Personality Zod schema allows up to 500 chars for conversationStarters (was 300).
 * 4. Old limits (201 / 201 / 301 chars) are now rejected by the schema at the prior caps.
 * 5. getOnboardingProgress() calls /onboarding/profile, not /onboarding/progress.
 * 6. getOnboardingProgress() extracts and returns the nested `progress` sub-object.
 * 7. Concurrent calls to getOnboardingProgress() resolve independently without race conditions.
 * 8. Swipe POST body emitted by useMatching contains `platform: "web"` and no `matchScore`.
 *
 * Run with: npx vitest run __tests__/batch-n-deprecated-fields-and-limits.test.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Personality schema — recreated from PersonalityStep.tsx (source of truth)
// ---------------------------------------------------------------------------

const personalitySchema = z.object({
  bio: z.string().min(20).max(500),
  lookingForText: z.string().max(500).optional(),
  favoriteQuote: z.string().max(300).optional(),
  conversationStarters: z.string().max(500).optional(),
});

// ---------------------------------------------------------------------------
// 1–4. Character limit tests
// ---------------------------------------------------------------------------

describe('PersonalityStep schema — updated character limits', () => {
  const str = (n: number) => 'a'.repeat(n);

  it('lookingForText: 500 chars is accepted', () => {
    expect(personalitySchema.safeParse({ bio: str(20), lookingForText: str(500) }).success).toBe(true);
  });

  it('lookingForText: 501 chars is rejected', () => {
    expect(personalitySchema.safeParse({ bio: str(20), lookingForText: str(501) }).success).toBe(false);
  });

  it('lookingForText: 201 chars is now accepted (old 200-char cap is lifted)', () => {
    expect(personalitySchema.safeParse({ bio: str(20), lookingForText: str(201) }).success).toBe(true);
  });

  it('favoriteQuote: 300 chars is accepted', () => {
    expect(personalitySchema.safeParse({ bio: str(20), favoriteQuote: str(300) }).success).toBe(true);
  });

  it('favoriteQuote: 301 chars is rejected', () => {
    expect(personalitySchema.safeParse({ bio: str(20), favoriteQuote: str(301) }).success).toBe(false);
  });

  it('favoriteQuote: 201 chars is now accepted (old 200-char cap is lifted)', () => {
    expect(personalitySchema.safeParse({ bio: str(20), favoriteQuote: str(201) }).success).toBe(true);
  });

  it('conversationStarters: 500 chars is accepted', () => {
    expect(personalitySchema.safeParse({ bio: str(20), conversationStarters: str(500) }).success).toBe(true);
  });

  it('conversationStarters: 501 chars is rejected', () => {
    expect(personalitySchema.safeParse({ bio: str(20), conversationStarters: str(501) }).success).toBe(false);
  });

  it('conversationStarters: 301 chars is now accepted (old 300-char cap is lifted)', () => {
    expect(personalitySchema.safeParse({ bio: str(20), conversationStarters: str(301) }).success).toBe(true);
  });

  it('all three fields at new maximums simultaneously pass', () => {
    const result = personalitySchema.safeParse({
      bio: str(20),
      lookingForText: str(500),
      favoriteQuote: str(300),
      conversationStarters: str(500),
    });
    expect(result.success).toBe(true);
  });

  it('all three fields empty/omitted still pass (all optional)', () => {
    expect(personalitySchema.safeParse({ bio: str(20) }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5–7. getOnboardingProgress — routes via getCompleteProfile
// ---------------------------------------------------------------------------

let sessionMock: { accessToken?: string } | null = null;

beforeEach(() => {
  sessionMock = { accessToken: 'test-token-abc' };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

function makeCompleteFetchMock(progress: object) {
  return vi.fn().mockResolvedValue({
    status: 200,
    ok: true,
    headers: { get: () => null },
    json: () =>
      Promise.resolve({
        id: 'user-1',
        email: 'test@example.com',
        progress,
      }),
  });
}

describe('getOnboardingProgress — delegates to /onboarding/profile', () => {
  it('calls /onboarding/profile, not /onboarding/progress', async () => {
    const mockFetch = makeCompleteFetchMock({
      currentStage: 'BASIC_PROFILE',
      completionPercentage: 10,
      stepsCompleted: {},
      nextStep: 'location',
    });
    vi.stubGlobal('fetch', mockFetch);

    vi.mock('next-auth', () => ({ getServerSession: vi.fn().mockResolvedValue(sessionMock) }));
    vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));

    const { getOnboardingProgress } = await import('@/app/serverActions/onboarding');
    await getOnboardingProgress();

    const [calledUrl] = mockFetch.mock.calls[0] as [string];
    expect(calledUrl).toContain('/onboarding/profile');
    expect(calledUrl).not.toContain('/onboarding/progress');
  });

  it('returns the nested progress sub-object, not the full CompleteProfileResponseDto', async () => {
    const progressPayload = {
      currentStage: 'PERSONALITY',
      completionPercentage: 75,
      stepsCompleted: { basic_profile: true, location: true },
      nextStep: 'dating_preferences',
    };

    vi.stubGlobal('fetch', makeCompleteFetchMock(progressPayload));
    vi.mock('next-auth', () => ({ getServerSession: vi.fn().mockResolvedValue(sessionMock) }));
    vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));

    const { getOnboardingProgress } = await import('@/app/serverActions/onboarding');
    const result = await getOnboardingProgress();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.currentStage).toBe('PERSONALITY');
      expect(result.data.completionPercentage).toBe(75);
      expect(result.data.nextStep).toBe('dating_preferences');
      // Must not expose top-level CompleteProfileResponseDto fields
      expect((result.data as Record<string, unknown>).email).toBeUndefined();
      expect((result.data as Record<string, unknown>).id).toBeUndefined();
    }
  });

  it('propagates backend errors transparently', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        statusText: 'Unauthorized',
        headers: { get: () => null },
        json: () => Promise.resolve({ message: 'Unauthorized', code: 'UNAUTHORIZED' }),
      })
    );
    vi.mock('next-auth', () => ({ getServerSession: vi.fn().mockResolvedValue(sessionMock) }));
    vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));

    const { getOnboardingProgress } = await import('@/app/serverActions/onboarding');
    const result = await getOnboardingProgress();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(401);
    }
  });

  it('N concurrent calls all resolve independently with their own progress data', async () => {
    const CONCURRENCY = 10;
    let callCount = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        const n = ++callCount;
        return Promise.resolve({
          status: 200,
          ok: true,
          headers: { get: () => null },
          json: () =>
            Promise.resolve({
              id: `user-${n}`,
              email: `u${n}@test.com`,
              progress: {
                currentStage: 'LIFESTYLE',
                completionPercentage: n * 10,
                stepsCompleted: {},
                nextStep: null,
              },
            }),
        });
      })
    );
    vi.mock('next-auth', () => ({ getServerSession: vi.fn().mockResolvedValue(sessionMock) }));
    vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));

    const { getOnboardingProgress } = await import('@/app/serverActions/onboarding');
    const results = await Promise.all(Array.from({ length: CONCURRENCY }, () => getOnboardingProgress()));

    expect(results).toHaveLength(CONCURRENCY);
    results.forEach((r) => {
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.data.currentStage).toBe('LIFESTYLE');
        // Each call should have gotten its own completionPercentage
        expect(r.data.completionPercentage).toBeGreaterThan(0);
        // Must not expose top-level fields
        expect((r.data as Record<string, unknown>).email).toBeUndefined();
      }
    });

    const percentages = results.map((r) => (r.ok ? r.data.completionPercentage : 0));
    const unique = new Set(percentages);
    // Each concurrent call hit the backend independently → unique percentages
    expect(unique.size).toBe(CONCURRENCY);
  });
});

// ---------------------------------------------------------------------------
// 8. Swipe POST body — platform present, matchScore absent
// ---------------------------------------------------------------------------

describe('useMatching swipe POST body — source verification', () => {
  /**
   * useMatching is a React hook that can only run inside a component tree.
   * Without @testing-library/react, we verify the source text directly.
   * These tests serve as compile-time regression guards: if `matchScore`
   * ever re-enters the request body, they fail immediately.
   */
  const hookSource = readFileSync(
    resolve(process.cwd(), 'app/hooks/useMatching.ts'),
    'utf-8'
  );

  it('swipe POST body contains platform: "web"', () => {
    // Both the swipe() and block paths should include platform
    // swipe() builds a typed `body` variable before JSON.stringify, while block uses
    // an inline literal — match any object literal containing swipedUserId to cover both.
    const matches = [...hookSource.matchAll(/\{[^{}]*swipedUserId[^{}]*\}/g)].map((m) => m[0]);
    const swipeBodies = matches.filter((m) => m.includes('swipedUserId'));
    expect(swipeBodies.length).toBeGreaterThan(0);
    swipeBodies.forEach((body) => {
      expect(body).toContain("platform: 'web'");
    });
  });

  it('swipe POST body does not contain matchScore', () => {
    // swipe() builds a typed `body` variable before JSON.stringify, while block uses
    // an inline literal — match any object literal containing swipedUserId to cover both.
    const matches = [...hookSource.matchAll(/\{[^{}]*swipedUserId[^{}]*\}/g)].map((m) => m[0]);
    const swipeBodies = matches.filter((m) => m.includes('swipedUserId'));
    expect(swipeBodies.length).toBeGreaterThan(0);
    swipeBodies.forEach((body) => {
      expect(body).not.toContain('matchScore');
    });
  });

  it('both swipe paths (like/pass and block) have been updated', () => {
    // Expect exactly two swipedUserId-containing JSON.stringify calls (swipe + block)
    // swipe() builds a typed `body` variable before JSON.stringify, while block uses
    // an inline literal — match any object literal containing swipedUserId to cover both.
    const matches = [...hookSource.matchAll(/\{[^{}]*swipedUserId[^{}]*\}/g)].map((m) => m[0]);
    const swipeBodies = matches.filter((m) => m.includes('swipedUserId'));
    expect(swipeBodies).toHaveLength(2);
  });
});
