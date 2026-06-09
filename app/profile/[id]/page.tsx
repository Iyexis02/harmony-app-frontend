'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Music,
  MapPin,
  Loader2,
  Heart,
  UserX,
  Star,
  Zap,
  Briefcase,
  GraduationCap,
  Baby,
  Cigarette,
  Wine,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  Quote,
  MessageSquare,
  Clock,
  Headphones,
  Ban,
} from 'lucide-react';

import { useMatching } from '@/app/hooks/useMatching';
import BlockConfirmDialog from '@/app/components/BlockConfirmDialog';
import {
  authenticatedApiRequest,
  isEmailVerificationError,
  isSpotifyTokenExpiredError,
} from '@/lib/api';
import { getScoreColorClass, formatEnumValue } from '@/lib/profileHelpers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { MatchScoreDto } from '@/types/phase3';

type PublicProfileDto = {
  userId?: string;
  name: string;
  age?: number;
  city?: string;
  country?: string;
  photos?: Array<{ imageUrl: string; displayOrder: number; isPrimary: boolean } | string>;
  primaryPhotoUrl?: string;
  musicPreferences?: {
    favoriteGenres?: string[];
    concertFrequency?: string;
    musicImportance?: string;
    favoriteDecades?: string[];
    openToNewGenres?: boolean;
    listeningTimes?: string[];
    hoursPerDay?: number;
  };
  lifestyle?: {
    occupation?: string;
    education?: string;
    relationshipStatus?: string;
    wantsKids?: string;
    smokingHabits?: string;
    drinkingHabits?: string;
    exerciseFrequency?: string;
  };
  personality?: {
    bio?: string;
    interests?: string[];
    mbti?: string;
    lookingForText?: string;
    favoriteQuote?: string;
    conversationStarters?: string;
  };
  datingPreferences?: {
    relationshipGoal?: string;
    minAge?: number;
    maxAge?: number;
  };
};

const SCORE_CATEGORIES = [
  { key: 'musicScore', label: 'Music', icon: Music },
  { key: 'lifestyleScore', label: 'Lifestyle', icon: Heart },
  { key: 'interestsScore', label: 'Interests', icon: Star },
  { key: 'locationScore', label: 'Location', icon: MapPin },
  { key: 'behavioralScore', label: 'Behavioral', icon: Zap },
] as const;

function extractPhotoUrls(
  photos: PublicProfileDto['photos'],
  primaryPhotoUrl?: string
): string[] {
  if (!photos || photos.length === 0) return primaryPhotoUrl ? [primaryPhotoUrl] : [];
  const sorted = [...photos].sort((a, b) => {
    const aO = typeof a === 'string' ? 0 : a.displayOrder;
    const bO = typeof b === 'string' ? 0 : b.displayOrder;
    return aO - bO;
  });
  return sorted.map((p) => (typeof p === 'string' ? p : p.imageUrl));
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  if (!value || value === 'Not specified') return null;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function MatchProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { getMatchScore, unmatch, blockMatch } = useMatching();

  const userId = params.id as string;
  const nameParam = searchParams.get('name') || '';
  const photoParam = searchParams.get('photo') || '';
  const scoreParam = parseInt(searchParams.get('score') || '0', 10);
  const matchIdParam = searchParams.get('matchId') || '';

  const [profile, setProfile] = useState<PublicProfileDto | null>(null);
  const [scoreData, setScoreData] = useState<MatchScoreDto | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingScore, setLoadingScore] = useState(true);
  const [profileError, setProfileError] = useState<{ status: number; message: string } | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoDir, setPhotoDir] = useState(1);
  const [unmatchDialogOpen, setUnmatchDialogOpen] = useState(false);
  const [unmatchLoading, setUnmatchLoading] = useState(false);
  const [unmatchConfirmed, setUnmatchConfirmed] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const token = (session as { accessToken?: string })?.accessToken;

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, userId]);

  const fetchScore = useCallback(async () => {
    setLoadingScore(true);
    setScoreData(await getMatchScore(userId));
    setLoadingScore(false);
  }, [getMatchScore, userId]);

  const fetchData = async () => {
    setLoadingProfile(true);
    setProfileError(null);

    if (!token) {
      setProfileError({ status: 401, message: 'You must be signed in to view this profile.' });
      setLoadingProfile(false);
      router.push('/login');
      return;
    }

    const result = await authenticatedApiRequest<PublicProfileDto>(
      `/api/v1/users/${userId}/profile`,
      token
    );

    if (result.ok) {
      setProfile(result.data);
    } else {
      if (isEmailVerificationError(result.error)) {
        toast.error('Please verify your email to continue');
        router.push('/verify-email');
        setLoadingProfile(false);
        return;
      }
      if (result.error.status === 401 && !isSpotifyTokenExpiredError(result.error)) {
        signOut({ callbackUrl: '/login' });
        setLoadingProfile(false);
        return;
      }
      if (result.error.status === 404) {
        setProfileError(result.error);
      } else {
        setProfileError(result.error);
        toast.error(result.error.message || 'Could not load profile');
      }
    }

    setLoadingProfile(false);
    await fetchScore();
  };

  const handleUnmatch = async () => {
    if (!matchIdParam) return;
    setUnmatchLoading(true);
    await unmatch(matchIdParam);
    setUnmatchLoading(false);
    setUnmatchDialogOpen(false);
    router.push('/matches');
  };

  const handleBlock = async () => {
    setBlockLoading(true);
    await blockMatch(userId, matchIdParam || undefined);
    setBlockLoading(false);
    setBlockDialogOpen(false);
    router.push('/matches');
  };

  // URL-param placeholders apply ONLY while loading — never as a fallback for a failed fetch.
  const showUrlFallback = loadingProfile && !profileError;

  const allPhotos = extractPhotoUrls(
    profile?.photos,
    profile?.primaryPhotoUrl || (showUrlFallback ? photoParam : '') || undefined
  );
  if (allPhotos.length === 0 && showUrlFallback && photoParam) allPhotos.push(photoParam);

  const prevPhoto = useCallback(() => {
    setPhotoDir(-1);
    setPhotoIndex((i) => (i - 1 + allPhotos.length) % allPhotos.length);
  }, [allPhotos.length]);

  const nextPhoto = useCallback(() => {
    setPhotoDir(1);
    setPhotoIndex((i) => (i + 1) % allPhotos.length);
  }, [allPhotos.length]);

  const displayName = profile?.name || (showUrlFallback ? nameParam : '');
  const displayAge = profile?.age;
  const displayScore = scoreData?.overallScore ?? scoreParam;
  const displayCity = profile?.city;
  const displayCountry = profile?.country;
  const displayBio = profile?.personality?.bio;
  const displayInterests = profile?.personality?.interests || [];
  const displayGenres = profile?.musicPreferences?.favoriteGenres || [];
  const displayMbti = profile?.personality?.mbti;
  const displayGoal = profile?.datingPreferences?.relationshipGoal;

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
  if (!session) return null;

  // Profile not found — dedicated UI per spec
  if (profileError?.status === 404) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border/40">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center">
            <Button variant="ghost" size="sm" onClick={() => router.push('/matches')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Matches
            </Button>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <UserX className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Profile not found</h1>
          <p className="text-sm text-muted-foreground mb-6">
            This profile is no longer available. The user may have deleted their account.
          </p>
          <Button onClick={() => router.push('/matches')}>Back to Matches</Button>
        </div>
      </div>
    );
  }

  // Other load errors — show a recoverable error UI
  if (profileError && !profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border/40">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center">
            <Button variant="ghost" size="sm" onClick={() => router.push('/matches')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Matches
            </Button>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <h1 className="text-xl font-semibold mb-2">Couldn&apos;t load this profile</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {profileError.message || 'Something went wrong. Please try again.'}
          </p>
          <Button onClick={fetchData}>Retry</Button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────── Photo carousel (shared) ── */
  const photoCarousel = (
    <div className="relative w-full aspect-3/4 rounded-2xl overflow-hidden bg-muted select-none">
      {allPhotos.length > 0 ? (
        <>
          <AnimatePresence initial={false} custom={photoDir} mode="sync">
            <motion.div
              key={photoIndex}
              custom={photoDir}
              initial={{ opacity: 0, x: photoDir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: photoDir * -40 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              <Image
                src={allPhotos[photoIndex]}
                alt={`Photo ${photoIndex + 1} of ${allPhotos.length} of ${displayName}`}
                fill
                className="object-cover object-top"
                priority
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>

          {/* Bottom gradient for dots */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/60 to-transparent pointer-events-none" />

          {allPhotos.length > 1 && (
            <>
              {/* Dot indicators */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {allPhotos.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Photo ${i + 1}`}
                    onClick={() => { setPhotoDir(i > photoIndex ? 1 : -1); setPhotoIndex(i); }}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i === photoIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>

              {/* Left tap zone */}
              <button
                onClick={prevPhoto}
                aria-label="Previous photo"
                className="absolute left-0 top-0 h-full w-2/5 z-10 flex items-center justify-start pl-2.5 group"
              >
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-1.5">
                  <ChevronLeft className="h-4 w-4 text-white" />
                </div>
              </button>

              {/* Right tap zone */}
              <button
                onClick={nextPhoto}
                aria-label="Next photo"
                className="absolute right-0 top-0 h-full w-2/5 z-10 flex items-center justify-end pr-2.5 group"
              >
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-1.5">
                  <ChevronRight className="h-4 w-4 text-white" />
                </div>
              </button>

              {/* Counter */}
              <div className="absolute top-3 right-3 z-10 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                {photoIndex + 1}/{allPhotos.length}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <Music className="h-16 w-16 text-muted-foreground/40" />
        </div>
      )}
    </div>
  );

  /* ─────────────────────────────── Identity chips ── */
  const identityChips = (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {(displayCity || displayCountry) && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
          <MapPin className="h-3 w-3" />
          {[displayCity, displayCountry].filter(Boolean).join(', ')}
        </span>
      )}
      {displayMbti && (
        <span className="inline-flex items-center text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
          {displayMbti}
        </span>
      )}
      {displayGoal && (
        <span className="inline-flex items-center text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
          {formatEnumValue(displayGoal)}
        </span>
      )}
    </div>
  );

  /* ─────────────────────────────── Content cards ── */
  const contentCards = (
    <div className="space-y-4">

      {/* Loading */}
      {loadingProfile && !profile && (
        <div className="flex items-center gap-2 text-muted-foreground py-1">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading profile…</span>
        </div>
      )}

      {/* About */}
      {(displayBio ||
        profile?.personality?.lookingForText ||
        profile?.personality?.favoriteQuote ||
        profile?.personality?.conversationStarters) && (
        <Card>
          <CardContent className="p-5 space-y-4">
            {displayBio && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">About</p>
                <p className="text-sm leading-relaxed text-foreground">{displayBio}</p>
              </div>
            )}
            {profile?.personality?.lookingForText && (
              <>
                {displayBio && <Separator />}
                <div className="flex items-start gap-3">
                  <Heart className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Looking for</p>
                    <p className="text-sm text-foreground">{profile.personality.lookingForText}</p>
                  </div>
                </div>
              </>
            )}
            {profile?.personality?.favoriteQuote && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <Quote className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm italic text-foreground">
                    &ldquo;{profile.personality.favoriteQuote}&rdquo;
                  </p>
                </div>
              </>
            )}
            {profile?.personality?.conversationStarters && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Conversation starters</p>
                    <p className="text-sm text-foreground">{profile.personality.conversationStarters}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Interests */}
      {displayInterests.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Interests</p>
            <div className="flex flex-wrap gap-2">
              {displayInterests.map((interest) => (
                <Badge key={interest} variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  {interest}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compatibility */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Compatibility</p>
            <span className={`${getScoreColorClass(displayScore)} text-white text-xs font-bold px-2.5 py-1 rounded-full`}>
              {Math.round(displayScore)}% match
            </span>
          </div>

          {loadingScore ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : scoreData ? (
            <div className="space-y-5">
              <div className="space-y-2.5">
                {SCORE_CATEGORIES.map(({ key, label, icon: Icon }) => {
                  const val = Math.round(scoreData[key]);
                  const color = getScoreColorClass(val);
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${val}%` }}
                          transition={{ duration: 0.6, delay: 0.1 }}
                        />
                      </div>
                      <span className="text-xs font-bold w-8 text-right tabular-nums">{val}%</span>
                    </div>
                  );
                })}
              </div>

              {scoreData.insights?.length > 0 && (
                <>
                  <Separator />
                  <ul className="space-y-1.5">
                    {scoreData.insights.map((insight, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-1 leading-none shrink-0">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {(scoreData.breakdown?.sharedGenres?.length ?? 0) > 0 && scoreData.breakdown && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Shared genres · {scoreData.breakdown.sharedGenreCount}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {scoreData.breakdown.sharedGenres!.slice(0, 15).map((sg) => (
                        <Badge key={sg.genre} variant="secondary" className="text-xs rounded-full">
                          {sg.genreDisplayName || sg.genre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {(scoreData.breakdown?.sharedInterests?.length ?? 0) > 0 && scoreData.breakdown && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Shared interests</p>
                    <div className="flex flex-wrap gap-1.5">
                      {scoreData.breakdown.sharedInterests!.map((interest) => (
                        <Badge key={interest} variant="outline" className="text-xs rounded-full">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">Compatibility data unavailable.</p>
              <Button size="sm" variant="outline" onClick={fetchScore}>
                Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Music */}
      {(displayGenres.length > 0 || profile?.musicPreferences) && (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Headphones className="h-3.5 w-3.5" /> Music
            </p>

            {displayGenres.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">Genres</p>
                <div className="flex flex-wrap gap-1.5">
                  {displayGenres.map((genre) => (
                    <Badge key={genre} variant="secondary" className="rounded-full text-xs">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profile?.musicPreferences && (
              <>
                <InfoRow icon={Music} label="Concerts" value={formatEnumValue(profile.musicPreferences.concertFrequency)} />
                <InfoRow icon={Star} label="Music matters" value={formatEnumValue(profile.musicPreferences.musicImportance)} />
                {profile.musicPreferences.hoursPerDay !== undefined && (
                  <InfoRow icon={Clock} label="Daily listening" value={`${profile.musicPreferences.hoursPerDay}h / day`} />
                )}
                {profile.musicPreferences.openToNewGenres !== undefined && (
                  <InfoRow
                    icon={ArrowRight}
                    label="Open to new genres"
                    value={profile.musicPreferences.openToNewGenres ? 'Yes' : 'No'}
                  />
                )}
              </>
            )}

            {(profile?.musicPreferences?.favoriteDecades?.length ?? 0) > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Favorite decades</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile!.musicPreferences!.favoriteDecades!.map((d) => (
                    <Badge key={d} variant="outline" className="rounded-full text-xs">{d}</Badge>
                  ))}
                </div>
              </div>
            )}

            {(profile?.musicPreferences?.listeningTimes?.length ?? 0) > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Listens during</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile!.musicPreferences!.listeningTimes!.map((t) => (
                    <Badge key={t} variant="outline" className="rounded-full text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lifestyle */}
      {profile?.lifestyle && (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Lifestyle</p>
            <InfoRow icon={Briefcase}      label="Occupation"   value={profile.lifestyle.occupation} />
            <InfoRow icon={GraduationCap}  label="Education"    value={formatEnumValue(profile.lifestyle.education)} />
            <InfoRow icon={Heart}          label="Relationship" value={formatEnumValue(profile.lifestyle.relationshipStatus)} />
            <InfoRow icon={Baby}           label="Kids"         value={formatEnumValue(profile.lifestyle.wantsKids)} />
            <InfoRow icon={Dumbbell}       label="Exercise"     value={formatEnumValue(profile.lifestyle.exerciseFrequency)} />
            <InfoRow icon={Wine}           label="Drinking"     value={formatEnumValue(profile.lifestyle.drinkingHabits)} />
            <InfoRow icon={Cigarette}      label="Smoking"      value={formatEnumValue(profile.lifestyle.smokingHabits)} />
          </CardContent>
        </Card>
      )}
    </div>
  );

  /* ─────────────────────────────── Page ── */
  return (
    <div className="min-h-screen bg-background">

      {/* Top nav bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border/40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/matches')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Matches
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2"
              onClick={() => setBlockDialogOpen(true)}>
              <Ban className="h-4 w-4" />
              Block
            </Button>
            {matchIdParam && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 gap-2"
                onClick={() => setUnmatchDialogOpen(true)}>
                <UserX className="h-4 w-4" />
                Unmatch
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile layout: stacked ── */}
      <div className="lg:hidden">
        <div className="px-4 pt-4 pb-2">
          {/* Photo constrained to a sensible max-width so it never looks stretched */}
          <div className="max-w-sm mx-auto">
            {photoCarousel}
          </div>
        </div>
        <div className="px-4 py-3">
          <h1 className="text-2xl font-bold">
            {displayName}{displayAge ? `, ${displayAge}` : ''}
          </h1>
          {identityChips}
        </div>
        <div className="px-4 pb-10">
          {contentCards}
        </div>
      </div>

      {/* ── Desktop layout: sidebar + content ── */}
      <div className="hidden lg:block">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex gap-8 items-start">

            {/* Left: sticky photo column — fixed width, never stretches */}
            <div className="w-80 xl:w-96 shrink-0 sticky top-14 self-start">
              {photoCarousel}
              <div className="mt-4">
                <h1 className="text-2xl font-bold">
                  {displayName}{displayAge ? `, ${displayAge}` : ''}
                </h1>
                {identityChips}
              </div>
            </div>

            {/* Right: scrollable content */}
            <div className="flex-1 min-w-0 pb-10">
              {contentCards}
            </div>
          </div>
        </div>
      </div>

      {/* Block Dialog */}
      <BlockConfirmDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        userName={displayName}
        onConfirm={handleBlock}
        loading={blockLoading}
      />

      {/* Unmatch Dialog */}
      <Dialog open={unmatchDialogOpen} onOpenChange={(open) => { if (!open) { setUnmatchDialogOpen(false); setUnmatchConfirmed(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unmatch {displayName}?</DialogTitle>
            <DialogDescription>
              {displayName}&apos;s profile will be permanently removed from your matches. <strong>This cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-2 px-1 py-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={unmatchConfirmed}
              onChange={(e) => setUnmatchConfirmed(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-sm text-foreground">I understand this cannot be undone</span>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUnmatchDialogOpen(false); setUnmatchConfirmed(false); }} disabled={unmatchLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleUnmatch} disabled={unmatchLoading || !unmatchConfirmed}>
              {unmatchLoading ? 'Unmatching…' : 'Unmatch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
