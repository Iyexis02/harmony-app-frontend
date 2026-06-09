'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence } from 'framer-motion';
import { Heart, Star, X, RotateCcw, Sparkles, Undo2, AlertTriangle, UserCircle, Loader2, Ban, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useMatching } from '@/app/hooks/useMatching';
import { useNotifications } from '@/app/hooks/useNotifications';
import SwipeCard from './components/SwipeCard';
import ProfileSheet from './components/ProfileSheet';
import MatchNotification from '../matches/components/MatchNotification';
import BlockConfirmDialog from '@/app/components/BlockConfirmDialog';
import type { SwipeAction } from '@/types/phase3';

export type SwipeDirection = 'left' | 'right' | 'up' | null;

export default function DiscoverPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const {
    potentialMatches,
    currentMatch,
    currentMatchIndex,
    hasMoreMatches,
    hasMoreFromServer,
    loading,
    isFetchingMore,
    error,
    emailVerificationRequired,
    lastSwipeResult,
    lastSwipedUserId,
    fetchPotentialMatchesProgressive,
    fetchMorePotentialMatches,
    minScoreUsed,
    swipe,
    undoSwipe,
    clearLastSwipeResult,
    rateLimited,
    rateLimitResetAt,
  } = useMatching();

  const { signalNewMatch } = useNotifications();

  const isSwipingRef = useRef(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const rateLimitedRef = useRef(rateLimited);
  rateLimitedRef.current = rateLimited;
  // Ref so the keydown handler always sees the latest undoSwipe without re-registering
  const undoSwipeRef = useRef(undoSwipe);
  undoSwipeRef.current = undoSwipe;
  const lastSwipedUserIdRef = useRef(lastSwipedUserId);
  lastSwipedUserIdRef.current = lastSwipedUserId;

  const [exitDirection, setExitDirection] = useState<SwipeDirection>(null);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [showMatchNotification, setShowMatchNotification] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);

  // Redirect only when definitively logged out — see matches/page.tsx. Guarding on the
  // transient 'loading' state (where `session` is briefly undefined) avoids a spurious
  // /login bounce.
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch potential matches on mount — progressively lowers minScore (20→10→0) if empty
  useEffect(() => {
    if (session) {
      fetchPotentialMatchesProgressive(20);
    }
  }, [session, fetchPotentialMatchesProgressive]);

  // Auto-fetch more matches when running low (< 5 remaining), using the score that worked
  useEffect(() => {
    const remaining = potentialMatches.length - currentMatchIndex;
    if (remaining < 5 && remaining > 0 && hasMoreFromServer && !loading && !isFetchingMore) {
      fetchMorePotentialMatches(20, minScoreUsed);
    }
  }, [currentMatchIndex, potentialMatches.length, hasMoreFromServer, loading, isFetchingMore, fetchMorePotentialMatches, minScoreUsed]);

  // Show match notification when mutual match occurs; signal BottomNav badge
  useEffect(() => {
    if (lastSwipeResult?.resultedInMatch) {
      setShowMatchNotification(true);
      signalNewMatch();
    }
  }, [lastSwipeResult, signalNewMatch]);

  // Keyboard shortcuts: ← pass, → like, ↑ super like, Ctrl+Z undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Never intercept shortcuts when focus is in a text field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      // Ctrl+Z / Cmd+Z undo — evaluated before !currentMatch so it works after queue is empty
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (lastSwipedUserIdRef.current && !isSwipingRef.current) {
          undoSwipeRef.current();
        }
        return;
      }

      if (!currentMatch || loading || isSwipingRef.current || rateLimitedRef.current) return;
      if (e.key === 'ArrowLeft') handleSwipe('pass');
      else if (e.key === 'ArrowRight') handleSwipe('like');
      else if (e.key === 'ArrowUp') handleSwipe('super_like');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMatch, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSwipe = async (action: SwipeAction) => {
    if (!currentMatch || rateLimited || isSwipingRef.current) return;
    isSwipingRef.current = true;
    setIsSwiping(true);
    setExitDirection(action === 'like' ? 'right' : action === 'pass' ? 'left' : 'up');
    try {
      await swipe(currentMatch.userId, action, currentMatch.matchScore);
    } finally {
      isSwipingRef.current = false;
      setIsSwiping(false);
    }
  };

  const handleLike = () => handleSwipe('like');
  const handlePass = () => handleSwipe('pass');
  const handleSuperLike = () => handleSwipe('super_like');
  const handleUndo = async () => {
    if (!lastSwipedUserId || isSwipingRef.current) return;
    await undoSwipe();
  };

  const handleBlockConfirm = () => {
    setShowBlockDialog(false);
    handleSwipe('block');
  };

  const handleRefresh = () => {
    fetchPotentialMatchesProgressive(20);
  };

  const handleCloseMatchNotification = () => {
    setShowMatchNotification(false);
    clearLastSwipeResult();
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background page-enter">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header — editorial Velour */}
        <div className="text-center mb-8">
          <span className="v-mono" style={{ fontSize: 11, color: 'var(--v-fg-faint)' }}>
            · tonight&apos;s setlist ·
          </span>
          <h1
            className="v-display mt-3 mb-2"
            style={{ fontSize: 44, fontWeight: 500, color: 'var(--v-fg)' }}>
            Who&apos;s <span className="v-italic v-gold">listening?</span>
          </h1>
          <p style={{ color: 'var(--v-fg-muted)' }}>
            Each profile arrives with a compatibility score. Know before you swipe.
          </p>
        </div>

        {/* Main Content */}
        {loading && !currentMatch ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Finding your matches...</p>
          </div>
        ) : emailVerificationRequired ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center max-w-md">
              <MailCheck
                className="h-20 w-20 mx-auto mb-4"
                style={{ color: 'var(--v-gold)' }}
              />
              <h3
                className="v-display mb-2"
                style={{ fontSize: 30, fontWeight: 500, color: 'var(--v-fg)' }}>
                One more <span className="v-italic v-gold">note.</span>
              </h3>
              <p style={{ color: 'var(--v-fg-muted)' }} className="mb-6">
                Verify your email to start matching. Check your inbox for the link we sent — your
                profile and music taste are already saved and waiting.
              </p>
              <div className="space-y-3">
                <Button onClick={handleRefresh} className="w-full">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  I&apos;ve verified — reload matches
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/profile/settings')}
                  className="w-full"
                >
                  Go to settings
                </Button>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-6 py-4 rounded-lg max-w-md">
              <p className="font-semibold mb-2">Error</p>
              <p className="text-sm">{error}</p>
              <Button onClick={handleRefresh} className="mt-4 w-full">
                Try Again
              </Button>
            </div>
          </div>
        ) : currentMatch ? (
          <div className="max-w-md mx-auto">
            {/* Swipe Card Stack */}
            <div className="relative" style={{ height: 'min(600px, 85vh)' }}>
              <AnimatePresence mode="popLayout" custom={exitDirection}>
                <SwipeCard
                  key={currentMatch.userId}
                  match={currentMatch}
                  onSwipe={handleSwipe}
                  onShowDetails={() => setShowScoreBreakdown(true)}
                  exitDirection={exitDirection}
                />
              </AnimatePresence>
            </div>

            {/* Queue status strip — fixed height to prevent layout shift on action buttons */}
            <div className="h-10 flex items-center justify-center mt-4">
              {(() => {
                if (rateLimited) {
                  const secsLeft = rateLimitResetAt
                    ? Math.max(0, Math.ceil((rateLimitResetAt - Date.now()) / 1000))
                    : null;
                  return (
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full text-sm text-orange-600">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>
                        Slow down!{secsLeft != null ? ` Try again in ${secsLeft}s.` : ' Try again shortly.'}
                      </span>
                    </div>
                  );
                }
                const remaining = potentialMatches.length - currentMatchIndex;
                if (isFetchingMore) {
                  return (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Finding more matches…</span>
                    </div>
                  );
                }
                if (remaining <= 3 && !hasMoreFromServer) {
                  return (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-sm text-amber-600">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>Almost out of matches — check back soon or update your preferences.</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Action Buttons — Velour pill actions */}
            <div className="flex justify-center items-center gap-4 mt-8">
              <div className="flex flex-col items-center gap-1.5">
                <Button
                  size="lg"
                  variant="outline"
                  disabled={rateLimited || isSwiping}
                  className="rounded-full w-16 h-16 p-0 transition-all active:scale-90 duration-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(212,134,128,.08)',
                    border: '1px solid rgba(212,134,128,.35)',
                  }}
                  onClick={handlePass}
                  aria-label="Pass"
                >
                  <X style={{ width: 26, height: 26, color: 'var(--v-red)' }} strokeWidth={2} />
                </Button>
                <span
                  className="v-mono v-italic"
                  style={{ fontSize: 10, color: 'var(--v-fg-faint)', fontStyle: 'italic', textTransform: 'none', letterSpacing: '.02em', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                  pass
                </span>
              </div>

              <Button
                size="lg"
                variant="outline"
                disabled={!lastSwipedUserId}
                className="rounded-full w-12 h-12 p-0 transition-all active:scale-90 duration-100 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--v-border)',
                }}
                onClick={handleUndo}
                aria-label="Undo last swipe"
              >
                <Undo2 style={{ width: 18, height: 18, color: 'var(--v-fg-muted)' }} />
              </Button>

              <Button
                size="lg"
                variant="outline"
                disabled={rateLimited || isSwiping}
                className="rounded-full w-12 h-12 p-0 transition-all active:scale-90 duration-100 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--v-border)',
                }}
                onClick={() => setShowBlockDialog(true)}
                aria-label="Block this user"
              >
                <Ban style={{ width: 18, height: 18, color: 'var(--v-fg-muted)' }} />
              </Button>

              <div className="flex flex-col items-center gap-1.5">
                <Button
                  size="lg"
                  variant="outline"
                  disabled={rateLimited || isSwiping}
                  className="rounded-full w-16 h-16 p-0 transition-all active:scale-90 duration-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(167,211,155,.08)',
                    border: '1px solid rgba(167,211,155,.35)',
                  }}
                  onClick={handleSuperLike}
                  aria-label="Super Like — stands out to the other person (1 per day)"
                >
                  <Star style={{ width: 26, height: 26, color: 'var(--v-green)' }} strokeWidth={2} />
                </Button>
                <span
                  style={{ fontSize: 11, color: 'var(--v-fg-muted)', fontStyle: 'italic', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                  super like · 1/day
                </span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <Button
                  size="lg"
                  disabled={rateLimited || isSwiping}
                  className="rounded-full w-16 h-16 p-0 transition-all active:scale-90 duration-100 disabled:opacity-30 disabled:cursor-not-allowed v-cta-gold"
                  onClick={handleLike}
                  aria-label="Like"
                >
                  <Heart style={{ width: 26, height: 26, color: 'var(--v-ink)' }} strokeWidth={2.25} />
                </Button>
                <span
                  className="v-gold"
                  style={{ fontSize: 11, fontStyle: 'italic', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                  like
                </span>
              </div>
            </div>

            {/* Keyboard Hints — desktop only */}
            <div className="hidden md:block text-center mt-6 text-xs text-muted-foreground/60">
              <p>← Pass &nbsp;·&nbsp; ↑ Super Like &nbsp;·&nbsp; → Like &nbsp;·&nbsp; Ctrl+Z Undo &nbsp;·&nbsp; or swipe the card</p>
            </div>

            {/* Remaining Matches */}
            {hasMoreMatches && (
              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">More matches available</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center max-w-md">
              <Heart
                className="h-20 w-20 mx-auto mb-4"
                style={{ color: 'var(--v-fg-faint)' }}
              />
              <h3
                className="v-display mb-2"
                style={{ fontSize: 30, fontWeight: 500, color: 'var(--v-fg)' }}>
                The room is <span className="v-italic v-gold">quiet.</span>
              </h3>
              <p style={{ color: 'var(--v-fg-muted)' }} className="mb-6">
                You&apos;ve heard every profile tonight. Check back soon — or adjust what you&apos;re listening for.
              </p>

              {/* Profile completion nudge — shown when we had to drop to lowest score threshold */}
              {minScoreUsed === 0 && (
                <div className="flex items-start gap-3 p-4 mb-6 bg-primary/5 border border-primary/20 rounded-xl text-left">
                  <UserCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Complete your profile</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      A complete profile with photos and music preferences significantly improves your match quality.
                    </p>
                    <button
                      onClick={() => router.push('/edit-profile')}
                      className="text-xs text-primary font-medium mt-2 hover:underline"
                    >
                      Go to Edit Profile →
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Button onClick={handleRefresh} className="w-full">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Refresh Matches
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/preferences/edit')}
                  className="w-full"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Update Preferences
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Sheet */}
      {currentMatch && (
        <ProfileSheet
          isOpen={showScoreBreakdown}
          onClose={() => setShowScoreBreakdown(false)}
          match={currentMatch}
          onLike={() => { setShowScoreBreakdown(false); handleLike(); }}
          onPass={() => { setShowScoreBreakdown(false); handlePass(); }}
        />
      )}

      {/* Match Notification */}
      <MatchNotification
        isOpen={showMatchNotification}
        onClose={handleCloseMatchNotification}
        match={lastSwipeResult?.match || null}
        swipeAction={lastSwipeResult?.action}
        currentUserPhoto={session.user?.image ?? undefined}
      />

      {/* Block Confirm Dialog */}
      {currentMatch && (
        <BlockConfirmDialog
          open={showBlockDialog}
          onOpenChange={setShowBlockDialog}
          userName={currentMatch.name}
          onConfirm={handleBlockConfirm}
        />
      )}
    </div>
  );
}
