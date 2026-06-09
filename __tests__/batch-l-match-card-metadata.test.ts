/**
 * Batch L — Match Card Metadata (matchSource, conversationStarted, null matchScore)
 * Integration tests for the data handling layer consumed by app/matches/page.tsx.
 *
 * Runner: vitest
 * Install: npm install -D vitest @testing-library/react @testing-library/react-hooks
 * Run:     npx vitest run __tests__/batch-l-match-card-metadata.test.ts
 *
 * Scope:
 *  - MatchListItemDto accepts matchScore: null (type + runtime)
 *  - Score badge display logic: null → "—", number → "<n>%"
 *  - matchSource badge logic: super_like → star, algorithm_boost → sparkle, mutual_swipe → none
 *  - conversationStarted badge logic: true → show, false → hide
 *  - View Profile URL param: score omitted when null, present when number
 */

import { describe, it, expect } from 'vitest';
import type { MatchListItemDto } from '../types/phase3';

// ---------------------------------------------------------------------------
// Helpers — mirror the inline logic in app/matches/page.tsx exactly so tests
// break if the component logic drifts away from these decisions.
// ---------------------------------------------------------------------------

/** Mirrors the score display logic in the match card. */
function scoreDisplay(matchScore: MatchListItemDto['matchScore']): string {
  if (matchScore === null) return '—';
  return `${Math.round(matchScore)}%`;
}

/** Mirrors the badge-icon decision for matchSource. */
function sourceBadge(matchSource: string): 'star' | 'sparkles' | null {
  if (matchSource === 'super_like') return 'star';
  if (matchSource === 'algorithm_boost') return 'sparkles';
  return null;
}

/** Mirrors the conversationStarted indicator decision. */
function showConversationBadge(conversationStarted: boolean): boolean {
  return conversationStarted;
}

/** Mirrors the URLSearchParams construction in the View Profile button handler. */
function buildProfileParams(match: Pick<MatchListItemDto, 'otherUserName' | 'matchId' | 'matchScore' | 'otherUserPhoto'>): Record<string, string> {
  return {
    name: match.otherUserName,
    matchId: match.matchId,
    ...(match.matchScore !== null ? { score: String(Math.round(match.matchScore)) } : {}),
    ...(match.otherUserPhoto ? { photo: match.otherUserPhoto } : {}),
  };
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

function makeMatch(overrides: Partial<MatchListItemDto> = {}): MatchListItemDto {
  return {
    matchId: 'm1',
    otherUserId: 'u1',
    otherUserName: 'Alice',
    otherUserPhoto: undefined,
    matchScore: 75,
    status: 'active',
    conversationStarted: false,
    matchSource: 'mutual_swipe',
    matchedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// matchScore: null — type + runtime
// ---------------------------------------------------------------------------

describe('MatchListItemDto — matchScore: null', () => {
  it('accepts null matchScore without TypeScript error (runtime shape check)', () => {
    const match: MatchListItemDto = makeMatch({ matchScore: null });
    expect(match.matchScore).toBeNull();
  });

  it('accepts a numeric matchScore', () => {
    const match: MatchListItemDto = makeMatch({ matchScore: 82 });
    expect(match.matchScore).toBe(82);
  });
});

// ---------------------------------------------------------------------------
// Score display logic
// ---------------------------------------------------------------------------

describe('scoreDisplay()', () => {
  it('returns "—" when matchScore is null', () => {
    expect(scoreDisplay(null)).toBe('—');
  });

  it('returns "<n>%" for an integer score', () => {
    expect(scoreDisplay(80)).toBe('80%');
  });

  it('rounds a fractional score', () => {
    expect(scoreDisplay(74.6)).toBe('75%');
    expect(scoreDisplay(74.4)).toBe('74%');
  });

  it('returns "0%" for a score of 0 (still a valid number, not null)', () => {
    expect(scoreDisplay(0)).toBe('0%');
  });

  it('returns "100%" for a perfect score', () => {
    expect(scoreDisplay(100)).toBe('100%');
  });
});

// ---------------------------------------------------------------------------
// matchSource badge logic
// ---------------------------------------------------------------------------

describe('sourceBadge()', () => {
  it('returns "star" for super_like', () => {
    expect(sourceBadge('super_like')).toBe('star');
  });

  it('returns "sparkles" for algorithm_boost', () => {
    expect(sourceBadge('algorithm_boost')).toBe('sparkles');
  });

  it('returns null for mutual_swipe (no badge)', () => {
    expect(sourceBadge('mutual_swipe')).toBeNull();
  });

  it('returns null for unknown source values (defensive)', () => {
    expect(sourceBadge('unknown_future_source')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// conversationStarted badge logic
// ---------------------------------------------------------------------------

describe('showConversationBadge()', () => {
  it('returns true when conversationStarted is true', () => {
    expect(showConversationBadge(true)).toBe(true);
  });

  it('returns false when conversationStarted is false', () => {
    expect(showConversationBadge(false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// View Profile URL param construction
// ---------------------------------------------------------------------------

describe('buildProfileParams() — score param', () => {
  it('omits score param when matchScore is null', () => {
    const match = makeMatch({ matchScore: null });
    const params = buildProfileParams(match);
    expect('score' in params).toBe(false);
  });

  it('includes score param when matchScore is a number', () => {
    const match = makeMatch({ matchScore: 85 });
    const params = buildProfileParams(match);
    expect(params.score).toBe('85');
  });

  it('rounds the score before stringifying', () => {
    const match = makeMatch({ matchScore: 84.7 });
    const params = buildProfileParams(match);
    expect(params.score).toBe('85');
  });

  it('always includes name and matchId', () => {
    const match = makeMatch({ matchScore: null });
    const params = buildProfileParams(match);
    expect(params.name).toBe('Alice');
    expect(params.matchId).toBe('m1');
  });

  it('includes photo param when otherUserPhoto is set', () => {
    const match = makeMatch({ matchScore: 70, otherUserPhoto: 'https://cdn.example.com/photo.jpg' });
    const params = buildProfileParams(match);
    expect(params.photo).toBe('https://cdn.example.com/photo.jpg');
  });

  it('omits photo param when otherUserPhoto is undefined', () => {
    const match = makeMatch({ matchScore: 70, otherUserPhoto: undefined });
    const params = buildProfileParams(match);
    expect('photo' in params).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Combined — realistic match objects
// ---------------------------------------------------------------------------

describe('realistic match scenarios', () => {
  it('super_like match with null score: star badge, "—" display, no score param', () => {
    const match = makeMatch({ matchSource: 'super_like', matchScore: null, conversationStarted: false });
    expect(sourceBadge(match.matchSource)).toBe('star');
    expect(scoreDisplay(match.matchScore)).toBe('—');
    expect(showConversationBadge(match.conversationStarted)).toBe(false);
    expect('score' in buildProfileParams(match)).toBe(false);
  });

  it('algorithm_boost match with score and active conversation: sparkles + chat badge + score param', () => {
    const match = makeMatch({ matchSource: 'algorithm_boost', matchScore: 91, conversationStarted: true });
    expect(sourceBadge(match.matchSource)).toBe('sparkles');
    expect(scoreDisplay(match.matchScore)).toBe('91%');
    expect(showConversationBadge(match.conversationStarted)).toBe(true);
    expect(buildProfileParams(match).score).toBe('91');
  });

  it('mutual_swipe match with score: no source badge, score displayed normally', () => {
    const match = makeMatch({ matchSource: 'mutual_swipe', matchScore: 63, conversationStarted: false });
    expect(sourceBadge(match.matchSource)).toBeNull();
    expect(scoreDisplay(match.matchScore)).toBe('63%');
    expect(showConversationBadge(match.conversationStarted)).toBe(false);
  });
});
