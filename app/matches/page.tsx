'use client';

import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/motion';
import { ArrowLeft, Heart, MessageCircle, Music, Sparkles, Star, UserX, Users, Ban } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDebounce } from '@/app/hooks/useDebounce';

import { useMatching } from '@/app/hooks/useMatching';
import BlockConfirmDialog from '@/app/components/BlockConfirmDialog';
import type { MatchAnalyticsDto } from '@/types/phase3';
import { useNotifications } from '@/app/hooks/useNotifications';
import { getScoreColorClass } from '@/lib/profileHelpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const containerVariants = staggerContainer(0.05);
const cardVariants = fadeInUp(20, 0.3);

export default function MatchesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { matches, loading, error, fetchMatches, fetchMoreMatches, matchesHasMore, isFetchingMoreMatches, fetchAnalytics, unmatch, blockMatch } = useMatching();
  const { markMatchesSeen } = useNotifications();
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const debouncedFilter = useDebounce(filter, 300);
  const [analytics, setAnalytics] = useState<MatchAnalyticsDto | null | undefined>(undefined);
  const [unmatchTarget, setUnmatchTarget] = useState<{ matchId: string; name: string } | null>(null);
  const [unmatchLoading, setUnmatchLoading] = useState(false);
  const [blockTarget, setBlockTarget] = useState<{ userId: string; matchId: string; name: string } | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Redirect only when definitively logged out. Guarding on `status` (not `!session`)
  // avoids a false redirect during the initial 'loading' phase, when `session` is
  // transiently undefined — that bounced through /login → middleware → /discover, making
  // this page unreachable on hard navigation/refresh.
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Clear badge + persist seen count once the list has loaded
  useEffect(() => {
    if (hasFetched) {
      markMatchesSeen(matches.length);
    }
  }, [hasFetched, matches.length, markMatchesSeen]);

  // Fetch matches on mount
  useEffect(() => {
    if (session) {
      fetchMatches(debouncedFilter).then(() => setHasFetched(true));
    }
  }, [session, debouncedFilter, fetchMatches]);

  // Fetch analytics only when the empty state is actually showing
  useEffect(() => {
    if (!hasFetched || matches.length > 0 || loading || analytics !== undefined) return;
    fetchAnalytics().then((data) => setAnalytics(data ?? null));
  }, [hasFetched, matches.length, loading, analytics, fetchAnalytics]);

  const handleUnmatch = async () => {
    if (!unmatchTarget) return;
    setUnmatchLoading(true);
    await unmatch(unmatchTarget.matchId);
    setUnmatchLoading(false);
    setUnmatchTarget(null);
  };

  const handleBlock = async () => {
    if (!blockTarget) return;
    setBlockLoading(true);
    await blockMatch(blockTarget.userId, blockTarget.matchId);
    setBlockLoading(false);
    setBlockTarget(null);
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background page-enter">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/discover')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'var(--v-gold-grad-135)',
                boxShadow: 'var(--v-shadow-gold-glow)',
              }}>
              <Users style={{ width: 22, height: 22, color: 'var(--v-ink)' }} strokeWidth={2.25} />
            </div>
            <div>
              <span className="v-mono" style={{ fontSize: 10, color: 'var(--v-fg-faint)' }}>
                · program notes ·
              </span>
              <h1
                className="v-display"
                style={{ fontSize: 34, fontWeight: 500, margin: '2px 0 0', color: 'var(--v-fg)' }}>
                Your <span className="v-italic v-gold">matches.</span>
              </h1>
              <p className="v-mono" style={{ fontSize: 11, color: 'var(--v-fg-faint)', marginTop: 4 }}>
                {matches.length} {matches.length === 1 ? 'duet' : 'duets'} in rotation
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'active' | 'all')} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="all">All Matches</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Loading Skeleton — also shown before first fetch completes to prevent "0 matches" flash */}
        {loading || !hasFetched ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-24 h-24 rounded-full shrink-0" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-28" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-24 rounded-md" />
                        <Skeleton className="h-8 w-24 rounded-md" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-6 py-4 rounded-lg">
            <p className="font-semibold mb-2">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : matches.length === 0 && analytics === undefined ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-24 h-24 rounded-full shrink-0" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-28" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-24 rounded-md" />
                        <Skeleton className="h-8 w-24 rounded-md" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center max-w-md">
              {filter === 'active' && (analytics?.totalMatches ?? 0) > 0 ? (
                <>
                  <Heart className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">No Active Matches</h3>
                  <p className="text-muted-foreground mb-6">
                    You&apos;ve had matches before — check All Matches or keep swiping for new ones.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button onClick={() => setFilter('all')} size="lg">
                      View All Matches
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/discover')} size="lg">
                      Keep Swiping
                    </Button>
                  </div>
                </>
              ) : analytics !== null && (analytics?.totalLikes ?? 0) > 0 ? (
                <>
                  <Heart className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">No Mutual Matches Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    You&apos;ve liked {analytics!.totalLikes}{' '}
                    {analytics!.totalLikes === 1 ? 'person' : 'people'} — keep going, it only takes one mutual like!
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button onClick={() => router.push('/discover')} size="lg">
                      Keep Swiping
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/preferences/edit')} size="lg">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Update Preferences
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Heart className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Start Discovering</h3>
                  <p className="text-muted-foreground mb-6">
                    Head to Discover to find people who share your music taste.
                  </p>
                  <Button onClick={() => router.push('/discover')} size="lg">
                    Start Swiping
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <motion.div
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="show">
            {matches.map((match) => (
              <motion.div key={match.matchId} variants={cardVariants}>
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Photo */}
                      <div className="relative w-24 h-24 rounded-full overflow-hidden bg-primary/20 shrink-0">
                        {match.otherUserPhoto ? (
                          <Image src={match.otherUserPhoto} alt={match.otherUserName} fill className="object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Music className="h-8 w-8 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold truncate">{match.otherUserName}</h3>
                            <p className="text-sm text-muted-foreground">
                              Matched {formatDistanceToNow(new Date(match.matchedAt))} ago
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {match.matchSource === 'super_like' && (
                              <Star className="h-4 w-4 text-yellow-400 shrink-0" aria-label="Super like" />
                            )}
                            {match.matchSource === 'algorithm_boost' && (
                              <Sparkles className="h-4 w-4 text-purple-400 shrink-0" aria-label="Algorithm boost" />
                            )}
                            {match.conversationStarted && (
                              <MessageCircle className="h-4 w-4 text-primary shrink-0" aria-label="Conversation started" />
                            )}
                            {match.matchScore !== null ? (
                              <div
                                className={`${getScoreColorClass(match.matchScore)} text-white px-3 py-1 rounded-full flex items-center gap-1`}>
                                <Music className="h-3 w-3" />
                                <span className="font-bold text-sm">{Math.round(match.matchScore)}%</span>
                              </div>
                            ) : (
                              <div className="bg-muted text-muted-foreground px-3 py-1 rounded-full flex items-center gap-1">
                                <Music className="h-3 w-3" />
                                <span className="font-bold text-sm">—</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const params = new URLSearchParams({
                                name: match.otherUserName,
                                matchId: match.matchId,
                                ...(match.matchScore !== null ? { score: String(Math.round(match.matchScore)) } : {}),
                                ...(match.otherUserPhoto ? { photo: match.otherUserPhoto } : {}),
                              });
                              router.push(`/profile/${match.otherUserId}?${params}`);
                            }}>
                            View Profile
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => setUnmatchTarget({ matchId: match.matchId, name: match.otherUserName })}>
                            <UserX className="h-4 w-4 mr-2" />
                            Unmatch
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive hover:border-destructive/40"
                            onClick={() => setBlockTarget({ userId: match.otherUserId, matchId: match.matchId, name: match.otherUserName })}>
                            <Ban className="h-4 w-4 mr-2" />
                            Block
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {matchesHasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => fetchMoreMatches(debouncedFilter)}
                  disabled={isFetchingMoreMatches}>
                  {isFetchingMoreMatches ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Block Confirm Dialog */}
      <BlockConfirmDialog
        open={!!blockTarget}
        onOpenChange={(open) => !open && setBlockTarget(null)}
        userName={blockTarget?.name ?? ''}
        onConfirm={handleBlock}
        loading={blockLoading}
      />

      {/* Unmatch Confirm Dialog */}
      <Dialog open={!!unmatchTarget} onOpenChange={(open) => !open && setUnmatchTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unmatch {unmatchTarget?.name}?</DialogTitle>
            <DialogDescription>
              This will permanently remove your match with {unmatchTarget?.name}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnmatchTarget(null)} disabled={unmatchLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleUnmatch} disabled={unmatchLoading}>
              {unmatchLoading ? 'Unmatching...' : 'Unmatch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
