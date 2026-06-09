import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { toast } from 'sonner';

import { authenticatedApiRequest, isEmailVerificationError } from '@/lib/api';
import { logError } from '@/lib/logger';
import { ErrorCode } from '@/types/error';
import type {
  PotentialMatchDto,
  MatchScoreDto,
  SwipeResponseDto,
  SwipeAction,
  MatchListItemDto,
  MatchAnalyticsDto,
} from '@/types/phase3';

export function useMatching() {
  const { data: session } = useSession();
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatchDto[]>([]);
  const [matches, setMatches] = useState<MatchListItemDto[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMoreFromServer, setHasMoreFromServer] = useState(false);
  const [minScoreUsed, setMinScoreUsed] = useState(20);
  const [loading, setLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
  const [lastSwipeResult, setLastSwipeResult] = useState<SwipeResponseDto | null>(null);
  const [lastSwipedUserId, setLastSwipedUserId] = useState<string | null>(null);
  const [scoreUnavailable, setScoreUnavailable] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitResetAt, setRateLimitResetAt] = useState<number | null>(null);
  const [scoreRateLimited, setScoreRateLimited] = useState(false);
  const [matchesOffset, setMatchesOffset] = useState(0);
  const [matchesHasMore, setMatchesHasMore] = useState(false);
  const [isFetchingMoreMatches, setIsFetchingMoreMatches] = useState(false);

  // Ref to track current index for optimistic rollback without stale closures
  const currentMatchIndexRef = useRef(0);
  currentMatchIndexRef.current = currentMatchIndex;

  const rateLimitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreRateLimitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (rateLimitTimeoutRef.current) clearTimeout(rateLimitTimeoutRef.current);
      if (scoreRateLimitTimeoutRef.current) clearTimeout(scoreRateLimitTimeoutRef.current);
    };
  }, []);

  const token = (session as any)?.accessToken as string | undefined;
  const currentUserId = session?.user?.id;

  const fetchPotentialMatches = useCallback(
    async (limit: number = 20, minScore: number = 60) => {
      if (!token) {
        setError('No authentication token');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await authenticatedApiRequest<{ matches: PotentialMatchDto[]; hasMore: boolean }>(
          `/api/v1/matching/potential?limit=${limit}&offset=0&minScore=${minScore}&excludeSwiped=true`,
          token
        );

        if (!result.ok) {
          if (isEmailVerificationError(result.error)) {
            toast.error('Please verify your email to continue');
            setEmailVerificationRequired(true);
            return;
          }
          if (result.error.code === ErrorCode.SPOTIFY_TOKEN_EXPIRED) {
            toast.error('Your Spotify connection has expired.', {
              action: { label: 'Reconnect', onClick: () => { window.location.href = '/api/spotify/connect'; } },
            });
            return;
          }
          if (result.error.status === 401) {
            if (localStorage.getItem('accountDeleted') !== 'true') {
              signOut({ redirect: true, callbackUrl: '/login' });
            }
            return;
          }
          throw new Error(result.error.message);
        }

        setPotentialMatches(result.data.matches || []);
        setHasMoreFromServer(result.data.hasMore ?? false);
        setOffset(result.data.matches?.length ?? 0);
        setCurrentMatchIndex(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching matches');
        logError('matching:fetch-potential', err, { userId: currentUserId });
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const fetchMorePotentialMatches = useCallback(
    async (limit: number = 20, minScore: number = 60) => {
      if (!token || !hasMoreFromServer) return;

      setIsFetchingMore(true);
      try {
        const result = await authenticatedApiRequest<{ matches: PotentialMatchDto[]; hasMore: boolean }>(
          `/api/v1/matching/potential?limit=${limit}&offset=${offset}&minScore=${minScore}&excludeSwiped=true`,
          token
        );

        if (!result.ok) {
          if (isEmailVerificationError(result.error)) {
            toast.error('Please verify your email to continue');
            setEmailVerificationRequired(true);
            return;
          }
          throw new Error(result.error.message);
        }

        setPotentialMatches((prev) => [...prev, ...(result.data.matches || [])]);
        setHasMoreFromServer(result.data.hasMore ?? false);
        setOffset((prev) => prev + (result.data.matches?.length ?? 0));
      } catch (err) {
        // Background fetch failures are silent — don't overwrite the main error state
        // or trigger the full-screen error overlay while the user has cards in view
        logError('matching:fetch-more-potential', err, { userId: currentUserId });
      } finally {
        setIsFetchingMore(false);
      }
    },
    [token, offset, hasMoreFromServer]
  );

  const fetchPotentialMatchesProgressive = useCallback(
    async (limit: number = 20) => {
      if (!token) {
        setError('No authentication token');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        for (const minScore of [20, 10, 0]) {
          const result = await authenticatedApiRequest<{ matches: PotentialMatchDto[]; hasMore: boolean }>(
            `/api/v1/matching/potential?limit=${limit}&offset=0&minScore=${minScore}&excludeSwiped=true`,
            token
          );

          if (!result.ok) {
            if (isEmailVerificationError(result.error)) {
              toast.error('Please verify your email to continue');
              setEmailVerificationRequired(true);
              return;
            }
            if (result.error.code === ErrorCode.SPOTIFY_TOKEN_EXPIRED) {
              toast.error('Your Spotify connection has expired.', {
                action: { label: 'Reconnect', onClick: () => { window.location.href = '/api/spotify/connect'; } },
              });
              return;
            }
            if (result.error.status === 401) {
              if (localStorage.getItem('accountDeleted') !== 'true') {
                signOut({ redirect: true, callbackUrl: '/login' });
              }
              return;
            }
            throw new Error(result.error.message);
          }

          const matchCount: number = result.data.matches?.length ?? 0;

          setPotentialMatches(result.data.matches || []);
          setHasMoreFromServer(result.data.hasMore ?? false);
          setOffset(matchCount);
          setCurrentMatchIndex(0);
          setMinScoreUsed(minScore);

          if (matchCount > 0 || minScore === 0) break;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching matches');
        logError('matching:fetch-potential-progressive', err, { userId: currentUserId });
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const VALID_SWIPE_ACTIONS: SwipeAction[] = ['like', 'pass', 'super_like', 'block'];

  const swipe = useCallback(
    async (swipedUserId: string, action: SwipeAction, matchScore: number) => {
      if (!token) {
        setError('No authentication token');
        return null;
      }

      if (!VALID_SWIPE_ACTIONS.includes(action)) {
        setError('Invalid swipe action.');
        return null;
      }

      // Optimistic: advance card immediately before server responds
      const prevIndex = currentMatchIndexRef.current;
      setCurrentMatchIndex((prev) => prev + 1);
      // Only track like/pass/super_like as undoable. Block is a deliberate action with its
      // own confirm dialog, and undoing a block row un-blocks the user server-side (there is
      // no separate unblock endpoint) — we don't want the Undo button to silently un-block.
      setLastSwipedUserId(action === 'block' ? null : swipedUserId);

      try {
        const body: Record<string, unknown> = { swipedUserId, action, platform: 'web' };
        // matchScore is deprecated in swagger and silently ignored by the server
        const result = await authenticatedApiRequest<SwipeResponseDto>(
          '/api/v1/matching/swipe',
          token,
          {
            method: 'POST',
            body: JSON.stringify(body),
          }
        );

        if (!result.ok) {
          if (isEmailVerificationError(result.error)) {
            toast.error('Please verify your email to continue');
            setEmailVerificationRequired(true);
            // Roll back the optimistic advance — the card stays visible
            setCurrentMatchIndex(prevIndex);
            setLastSwipedUserId(null);
            return null;
          }
          if (result.error.code === ErrorCode.SPOTIFY_TOKEN_EXPIRED) {
            toast.error('Your Spotify connection has expired.', {
              action: { label: 'Reconnect', onClick: () => { window.location.href = '/api/spotify/connect'; } },
            });
            setCurrentMatchIndex(prevIndex);
            setLastSwipedUserId(null);
            return null;
          }
          if (result.error.status === 401) {
            setCurrentMatchIndex(prevIndex);
            setLastSwipedUserId(null);
            if (localStorage.getItem('accountDeleted') !== 'true') {
              signOut({ redirect: true, callbackUrl: '/login' });
            }
            return null;
          }
          if (result.error.code === ErrorCode.DUPLICATE_SWIPE) {
            // Harmless race condition — the swipe already registered server-side.
            // Keep the optimistic advance; no toast needed.
            return null;
          }
          if (result.error.code === ErrorCode.NOT_FOUND) {
            // User deleted their account between page load and swipe.
            // Remove the ghost card and keep showing the next real card.
            setPotentialMatches((prev) => prev.filter((_, i) => i !== prevIndex));
            setCurrentMatchIndex(prevIndex);
            setLastSwipedUserId(null);
            toast.error('This user is no longer available');
            return null;
          }
          if (result.error.status === 429) {
            // Rate limited — roll back the optimistic advance and enter cooldown.
            setCurrentMatchIndex(prevIndex);
            setLastSwipedUserId(null);
            const seconds = result.error.retryAfter ?? 10;
            const resetAt = Date.now() + seconds * 1000;
            setRateLimited(true);
            setRateLimitResetAt(resetAt);
            if (rateLimitTimeoutRef.current) clearTimeout(rateLimitTimeoutRef.current);
            rateLimitTimeoutRef.current = setTimeout(() => {
              setRateLimited(false);
              setRateLimitResetAt(null);
              rateLimitTimeoutRef.current = null;
            }, seconds * 1000);
            toast.warning("You're swiping too fast! Take a breather.");
            return null;
          }
          // Default: roll back optimistic advance and surface the error.
          setCurrentMatchIndex(prevIndex);
          setLastSwipedUserId(null);
          toast.error(result.error.message || 'Swipe failed');
          return null;
        }

        // Store swipe result — match list is refreshed by fetchMatches() when user navigates to /matches
        setLastSwipeResult(result.data);
        return result.data;
      } catch (err) {
        // Roll back on unexpected errors (network failures, JSON parse errors, etc.)
        setCurrentMatchIndex(prevIndex);
        setLastSwipedUserId(null);
        toast.error(err instanceof Error ? err.message : 'Swipe failed — please try again');
        return null;
      }
    },
    [token]
  );

  const getMatchScore = useCallback(
    async (otherUserId: string): Promise<MatchScoreDto | null> => {
      if (!token) return null;

      try {
        const result = await authenticatedApiRequest<MatchScoreDto>(
          `/api/v1/matching/score/${otherUserId}`,
          token
        );

        if (!result.ok) {
          if (isEmailVerificationError(result.error)) {
            toast.error('Please verify your email to continue');
            setEmailVerificationRequired(true);
            return null;
          }
          if (result.error.code === ErrorCode.FORBIDDEN) {
            // Blocked relationship — signal UI to show "Compatibility unavailable".
            setScoreUnavailable(true);
            return null;
          }
          if (result.error.code === ErrorCode.INVALID_ARGUMENT) {
            // Self-score edge case — should not happen in normal flow.
            logError('matching:get-score', result.error.message, { userId: currentUserId, code: 'INVALID_ARGUMENT' });
            return null;
          }
          if (result.error.status === 429) {
            const seconds = result.error.retryAfter ?? 10;
            setScoreRateLimited(true);
            if (scoreRateLimitTimeoutRef.current) clearTimeout(scoreRateLimitTimeoutRef.current);
            scoreRateLimitTimeoutRef.current = setTimeout(() => {
              setScoreRateLimited(false);
              scoreRateLimitTimeoutRef.current = null;
            }, seconds * 1000);
            return null;
          }
          return null;
        }
        setScoreUnavailable(false);
        setScoreRateLimited(false);
        return result.data;
      } catch (err) {
        logError('matching:get-score', err, { userId: currentUserId });
        return null;
      }
    },
    [token]
  );

  const fetchMatches = useCallback(
    async (status: 'active' | 'all' = 'active', limit: number = 20) => {
      if (!token) {
        setError('No authentication token');
        return;
      }

      setLoading(true);
      setError(null);
      setMatchesOffset(0);

      try {
        const result = await authenticatedApiRequest<{ matches: MatchListItemDto[]; hasMore: boolean }>(
          `/api/v1/matching/matches?status=${status}&limit=${limit}&offset=0`,
          token
        );

        if (!result.ok) {
          if (isEmailVerificationError(result.error)) {
            toast.error('Please verify your email to continue');
            setEmailVerificationRequired(true);
            return;
          }
          if (result.error.code === ErrorCode.SPOTIFY_TOKEN_EXPIRED) {
            toast.error('Your Spotify connection has expired.', {
              action: { label: 'Reconnect', onClick: () => { window.location.href = '/api/spotify/connect'; } },
            });
            return;
          }
          if (result.error.status === 401) {
            if (localStorage.getItem('accountDeleted') !== 'true') {
              signOut({ redirect: true, callbackUrl: '/login' });
            }
            return;
          }
          throw new Error(result.error.message);
        }

        const fetched = result.data.matches || [];
        setMatches(fetched);
        setMatchesHasMore(result.data.hasMore ?? false);
        setMatchesOffset(fetched.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching matches');
        logError('matching:fetch-matches', err, { userId: currentUserId });
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const fetchMoreMatches = useCallback(
    async (status: 'active' | 'all' = 'active', limit: number = 20) => {
      if (!token || !matchesHasMore) return;

      setIsFetchingMoreMatches(true);
      try {
        const result = await authenticatedApiRequest<{ matches: MatchListItemDto[]; hasMore: boolean }>(
          `/api/v1/matching/matches?status=${status}&limit=${limit}&offset=${matchesOffset}`,
          token
        );

        if (!result.ok) {
          if (isEmailVerificationError(result.error)) {
            toast.error('Please verify your email to continue');
            setEmailVerificationRequired(true);
            return;
          }
          throw new Error(result.error.message);
        }

        const fetched = result.data.matches || [];
        setMatches((prev) => [...prev, ...fetched]);
        setMatchesHasMore(result.data.hasMore ?? false);
        setMatchesOffset((prev) => prev + fetched.length);
      } catch (err) {
        logError('matching:fetch-more-matches', err, { userId: currentUserId });
      } finally {
        setIsFetchingMoreMatches(false);
      }
    },
    [token, matchesOffset, matchesHasMore]
  );

  const fetchAnalytics = useCallback(async (): Promise<MatchAnalyticsDto | null> => {
    if (!token) return null;

    try {
      const result = await authenticatedApiRequest<MatchAnalyticsDto>(
        '/api/v1/matching/analytics',
        token
      );

      if (!result.ok) {
        if (isEmailVerificationError(result.error)) {
          toast.error('Please verify your email to continue');
          setEmailVerificationRequired(true);
        }
        return null;
      }
      return result.data;
    } catch (err) {
      logError('matching:fetch-analytics', err, { userId: currentUserId });
      return null;
    }
  }, [token]);

  const unmatch = useCallback(
    async (matchId: string): Promise<boolean> => {
      if (!token) return false;

      try {
        const result = await authenticatedApiRequest<void>(
          `/api/v1/matching/matches/${matchId}`,
          token,
          { method: 'DELETE' }
        );

        if (!result.ok) {
          if (isEmailVerificationError(result.error)) {
            toast.error('Please verify your email to continue');
            setEmailVerificationRequired(true);
            return false;
          }
          if (result.error.code === ErrorCode.NOT_FOUND) {
            // Match is already gone server-side — remove stale entry from local state.
            setMatches((prev) => prev.filter((m) => m.matchId !== matchId));
            toast.error('Match no longer exists');
            return true;
          }
          if (result.error.code === ErrorCode.FORBIDDEN) {
            toast.error('Unable to unmatch');
            return false;
          }
          throw new Error(result.error.message);
        }

        setMatches((prev) => prev.filter((m) => m.matchId !== matchId));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unmatch error');
        logError('matching:unmatch', err, { userId: currentUserId });
        return false;
      }
    },
    [token]
  );

  const blockMatch = useCallback(
    async (userId: string, matchId?: string): Promise<boolean> => {
      if (!token) return false;

      try {
        const result = await authenticatedApiRequest<SwipeResponseDto>(
          '/api/v1/matching/swipe',
          token,
          {
            method: 'POST',
            body: JSON.stringify({ swipedUserId: userId, action: 'block', platform: 'web' }),
          }
        );

        if (!result.ok) {
          if (result.error.code === ErrorCode.DUPLICATE_SWIPE) {
            // Already blocked server-side — clean up local state and treat as success.
            if (matchId) setMatches((prev) => prev.filter((m) => m.matchId !== matchId));
            toast.success('User blocked');
            return true;
          }
          toast.error(result.error.message || 'Block failed');
          return false;
        }

        if (matchId) setMatches((prev) => prev.filter((m) => m.matchId !== matchId));
        toast.success('User blocked');
        return true;
      } catch (err) {
        toast.error('Block failed — please try again');
        return false;
      }
    },
    [token]
  );

  const clearLastSwipeResult = useCallback(() => {
    setLastSwipeResult(null);
  }, []);

  const undoSwipe = useCallback(async () => {
    if (!lastSwipedUserId || !token) return;
    const userId = lastSwipedUserId;
    const prevIndex = currentMatchIndexRef.current;
    const snapshotSwipedUserId = lastSwipedUserId;
    const snapshotSwipeResult = lastSwipeResult;
    setCurrentMatchIndex((prev) => Math.max(0, prev - 1));
    // DELETE /api/v1/matching/swipe/{userId} resurfaces the candidate on the next
    // /potential call (backend invalidates its pool cache). Switch on the error `code`,
    // never the message or status: NOT_FOUND = nothing to undo, CONFLICT = the swipe
    // already became a match (must unmatch first).
    const result = await authenticatedApiRequest(`/api/v1/matching/swipe/${userId}`, token, { method: 'DELETE' });
    if (!result.ok) {
      logError('swipe:undo', result.error, { targetUserId: userId });
      setLastSwipedUserId(snapshotSwipedUserId);
      setLastSwipeResult(snapshotSwipeResult);
      setCurrentMatchIndex(prevIndex);
      if (result.error.status === 401) {
        if (localStorage.getItem('accountDeleted') !== 'true') {
          signOut({ redirect: true, callbackUrl: '/login' });
        }
      } else if (result.error.code === ErrorCode.NOT_FOUND) {
        toast.error('Nothing to undo.');
      } else if (result.error.code === ErrorCode.CONFLICT) {
        toast.error('You already matched — unmatch first to undo.');
      } else {
        toast.error('Could not undo swipe');
      }
      return;
    }
    setLastSwipeResult(null);
    setLastSwipedUserId(null);
    toast('Swipe undone ↩');
  }, [lastSwipedUserId, lastSwipeResult, token]);

  const currentMatch = potentialMatches[currentMatchIndex];
  const hasMoreMatches = currentMatchIndex < potentialMatches.length - 1;

  return {
    // State
    potentialMatches,
    matches,
    currentMatch,
    currentMatchIndex,
    hasMoreMatches,
    hasMoreFromServer,
    loading,
    isFetchingMore,
    error,
    emailVerificationRequired,
    lastSwipeResult,
    scoreUnavailable,
    rateLimited,
    rateLimitResetAt,
    scoreRateLimited,
    matchesHasMore,
    isFetchingMoreMatches,

    // Actions
    fetchPotentialMatches,
    fetchMorePotentialMatches,
    fetchPotentialMatchesProgressive,
    minScoreUsed,
    swipe,
    undoSwipe,
    getMatchScore,
    fetchMatches,
    fetchMoreMatches,
    fetchAnalytics,
    unmatch,
    blockMatch,
    clearLastSwipeResult,
    lastSwipedUserId,
  };
}
