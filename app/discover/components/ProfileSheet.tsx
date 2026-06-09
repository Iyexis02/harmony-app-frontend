'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart, MapPin, Music, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMatching } from '@/app/hooks/useMatching';
import { getScoreLabel, getScoreStrokeColor, getScoreTextColor, normalizeCompatibilityLevel } from '@/lib/profileHelpers';
import type { MatchScoreDto, PotentialMatchDto } from '@/types/phase3';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  match: PotentialMatchDto;
  onLike?: () => void;
  onPass?: () => void;
};

const SCORE_DIMENSIONS = [
  { label: '🎵 Music', key: 'musicScore' as const },
  { label: '🌿 Lifestyle', key: 'lifestyleScore' as const },
  { label: '✨ Interests', key: 'interestsScore' as const },
  { label: '📍 Location', key: 'locationScore' as const },
  { label: '🔄 Behavioral', key: 'behavioralScore' as const },
];

export default function ProfileSheet({ isOpen, onClose, match, onLike, onPass }: Props) {
  const { getMatchScore, scoreRateLimited } = useMatching();
  const [scoreData, setScoreData] = useState<MatchScoreDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const scoreCache = useRef<Map<string, MatchScoreDto>>(new Map());

  const photos = match.photos && match.photos.length > 0 ? match.photos : [];

  useEffect(() => {
    if (!isOpen) return;
    setPhotoIndex(0);
    const cached = scoreCache.current.get(match.userId);
    if (cached) {
      setScoreData(cached);
      return;
    }
    const load = async () => {
      setLoading(true);
      const data = await getMatchScore(match.userId);
      if (data) scoreCache.current.set(match.userId, data);
      setScoreData(data);
      setLoading(false);
    };
    load();
  }, [isOpen, match.userId, getMatchScore]);

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((i) => Math.max(0, i - 1));
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((i) => Math.min(photos.length - 1, i + 1));
  };

  const circumference = 2 * Math.PI * 20;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden p-0"
        showCloseButton={false}
      >
        {/* Visually-hidden title for screen readers */}
        <DialogTitle className="sr-only">{match.name}&apos;s Profile</DialogTitle>

        {/* ① Photo header — shrink-0 */}
        <div
          className="relative h-56 sm:h-72 shrink-0"
          style={{ background: 'linear-gradient(180deg, #2C1A24 0%, #1B0F1A 100%)' }}>
          {photos.length > 0 ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={photoIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0"
              >
                <Image src={photos[photoIndex]} alt={match.name} fill className="object-cover" priority />
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Music style={{ width: 72, height: 72, color: 'var(--v-fg-faint)' }} />
            </div>
          )}

          {/* Carousel dots */}
          {photos.length > 1 && (
            <div className="absolute top-3 left-0 right-0 flex justify-center gap-1 px-4 z-10">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className="h-[3px] rounded-full transition-all"
                  style={{
                    width: i === photoIndex ? 26 : 14,
                    background: i === photoIndex ? 'var(--v-gold)' : 'rgba(242,232,220,.35)',
                  }}
                />
              ))}
            </div>
          )}

          {/* Prev/next */}
          {photos.length > 1 && (
            <>
              {photoIndex > 0 && (
                <button
                  onClick={prevPhoto}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors z-10"
                  style={{
                    background: 'rgba(27,15,26,.55)',
                    border: '1px solid var(--v-border)',
                    color: 'var(--v-fg)',
                  }}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {photoIndex < photos.length - 1 && (
                <button
                  onClick={nextPhoto}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors z-10"
                  style={{
                    background: 'rgba(27,15,26,.55)',
                    border: '1px solid var(--v-border)',
                    color: 'var(--v-fg)',
                  }}>
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </>
          )}

          {/* Gradient + name overlay */}
          <div
            className="absolute bottom-0 left-0 right-0 h-28"
            style={{
              background:
                'linear-gradient(to top, rgba(27,15,26,.92) 0%, rgba(27,15,26,.6) 45%, transparent 100%)',
            }}
          />
          <div className="absolute bottom-4 left-5 right-5 z-[1]">
            <h2
              className="v-display"
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: 'var(--v-fg)',
                textShadow: '0 2px 12px rgba(0,0,0,.6)',
                lineHeight: 1.1,
              }}>
              {match.name}
              <span className="v-italic v-gold" style={{ marginLeft: 6 }}>
                , {match.age}
              </span>
            </h2>
            {match.distance !== undefined && (
              <div
                className="flex items-center gap-1.5 mt-1.5 v-mono"
                style={{ color: 'var(--v-fg-muted)', fontSize: 10 }}>
                <MapPin style={{ width: 12, height: 12 }} />
                <span>{match.distance.toFixed(1)} km away</span>
              </div>
            )}
          </div>
        </div>

        {/* ② Content area — loading/error/tabs */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : scoreRateLimited ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Try again shortly</p>
          </div>
        ) : scoreData ? (
          <Tabs defaultValue="overview" className="flex flex-col flex-1 min-h-0 gap-0">
            {/* Tabs bar — shrink-0 */}
            <TabsList className="w-full shrink-0 rounded-none h-10">
              <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
              <TabsTrigger value="music" className="flex-1">Music</TabsTrigger>
            </TabsList>

            {/* Overview tab */}
            <TabsContent value="overview" className="flex-1 overflow-y-auto p-5 space-y-5 mt-0">
              {/* City / country */}
              {match.city && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {match.city}{match.country ? `, ${match.country}` : ''}
                </p>
              )}

              {/* Bio */}
              {match.bio && (
                <>
                  <p className="text-sm text-foreground leading-relaxed">{match.bio}</p>
                  <Separator />
                </>
              )}

              {/* Compatibility summary */}
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 shrink-0">
                  <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90" role="img" aria-label={`Compatibility score: ${Math.round(scoreData.overallScore)} out of 100, ${getScoreLabel(scoreData.overallScore)} match`}>
                    <circle cx="24" cy="24" r="20" fill="rgba(27,15,26,.6)" stroke="rgba(232,177,92,.18)" strokeWidth="4" />
                    <circle
                      cx="24" cy="24" r="20"
                      fill="none"
                      style={{ stroke: getScoreStrokeColor(scoreData.overallScore) }}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${circumference}`}
                      strokeDashoffset={`${circumference * (1 - scoreData.overallScore / 100)}`}
                    />
                  </svg>
                  <span
                    className="absolute inset-0 flex items-center justify-center font-bold text-sm"
                    style={{ color: 'var(--v-fg)', fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(scoreData.overallScore)}%
                  </span>
                </div>
                <div>
                  <p className="v-mono" style={{ fontSize: 10, color: 'var(--v-fg-faint)' }}>
                    compatibility
                  </p>
                  <p
                    className="v-display v-italic"
                    style={{
                      fontSize: 22,
                      fontWeight: 500,
                      color: getScoreStrokeColor(scoreData.overallScore),
                      lineHeight: 1.15,
                      marginTop: 2,
                    }}>
                    {(() => {
                      const s = scoreData.overallScore;
                      if (s >= 80) return 'Rare harmony';
                      if (s >= 60) return 'A promising duet';
                      if (s >= 40) return 'A curious overture';
                      return 'A distant echo';
                    })()}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--v-fg-muted)',
                      marginTop: 2,
                    }}>
                    {normalizeCompatibilityLevel(scoreData.compatibilityLevel)}
                  </p>
                </div>
              </div>

              {/* Dimension bars */}
              <div className="space-y-3">
                {SCORE_DIMENSIONS.map(({ label, key }) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={`font-medium ${getScoreTextColor(scoreData[key])}`}>
                        {Math.round(scoreData[key])}%
                      </span>
                    </div>
                    <Progress value={scoreData[key]} className="h-1.5" />
                  </div>
                ))}
              </div>

              {/* Insights */}
              {scoreData.insights && scoreData.insights.length > 0 && (
                <div
                  className="relative overflow-hidden p-4"
                  style={{
                    background: 'var(--v-row)',
                    border: '1px solid var(--v-row-border)',
                    borderRadius: 14,
                  }}>
                  <div
                    className="absolute"
                    style={{
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 1,
                      background:
                        'linear-gradient(90deg, transparent, rgba(232,177,92,.4), transparent)',
                    }}
                  />
                  <p
                    className="v-mono mb-2"
                    style={{ fontSize: 10, color: 'var(--v-gold)' }}>
                    · notes in the margin ·
                  </p>
                  <ul className="space-y-1.5">
                    {scoreData.insights.map((insight, i) => (
                      <li
                        key={i}
                        style={{ fontSize: 13.5, color: 'var(--v-fg-muted)', lineHeight: 1.55 }}>
                        &mdash; {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>

            {/* Music tab */}
            <TabsContent value="music" className="flex-1 overflow-y-auto p-5 space-y-5 mt-0">
              {!scoreData.breakdown ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Music className="h-12 w-12 mb-2" />
                  <p className="text-sm">No music comparison data available</p>
                </div>
              ) : (
                <>
                  {/* Shared genres */}
                  {scoreData.breakdown.sharedGenres && scoreData.breakdown.sharedGenres.length > 0 && (
                    <div>
                      <h3
                        className="v-mono mb-3"
                        style={{ fontSize: 10, color: 'var(--v-fg-faint)' }}>
                        · shared music ·
                      </h3>
                      <div className="space-y-3">
                        {scoreData.breakdown.sharedGenres.map((genre, i) => (
                          <div
                            key={i}
                            className="p-3"
                            style={{
                              background: 'var(--v-card-2)',
                              border: '1px solid var(--v-border)',
                              borderRadius: 12,
                            }}>
                            <div className="flex items-center justify-between mb-2">
                              <p
                                className="v-display v-italic"
                                style={{ fontSize: 15, color: 'var(--v-fg)', fontWeight: 500 }}>
                                {genre.genre}
                              </p>
                              <span
                                className="v-mono"
                                style={{
                                  fontSize: 9.5,
                                  padding: '3px 9px',
                                  borderRadius: 9999,
                                  background: 'rgba(232,177,92,.08)',
                                  color: 'var(--v-gold-light)',
                                  border: '1px solid rgba(232,177,92,.2)',
                                }}>
                                {Math.round(genre.overlap * 100)}% overlap
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              <div>
                                <div
                                  className="flex justify-between mb-0.5 v-mono"
                                  style={{ fontSize: 9.5, color: 'var(--v-fg-faint)' }}>
                                  <span>you</span>
                                  <span>{Math.round(genre.userWeight * 100)}%</span>
                                </div>
                                <div
                                  className="h-[3px] rounded-full overflow-hidden"
                                  style={{ background: 'var(--v-divider)' }}>
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${genre.userWeight * 100}%`,
                                      background: 'var(--v-gold-grad)',
                                    }}
                                  />
                                </div>
                              </div>
                              <div>
                                <div
                                  className="flex justify-between mb-0.5 v-mono"
                                  style={{ fontSize: 9.5, color: 'var(--v-fg-faint)' }}>
                                  <span>{match.name.toLowerCase()}</span>
                                  <span>{Math.round(genre.otherWeight * 100)}%</span>
                                </div>
                                <div
                                  className="h-[3px] rounded-full overflow-hidden"
                                  style={{ background: 'var(--v-divider)' }}>
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${genre.otherWeight * 100}%`,
                                      background: 'var(--v-rose)',
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shared interests */}
                  {scoreData.breakdown.sharedInterests && scoreData.breakdown.sharedInterests.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold text-sm mb-2">✨ Shared Interests</h3>
                        <div className="flex flex-wrap gap-2">
                          {scoreData.breakdown.sharedInterests.map((interest, i) => (
                            <Badge key={i} variant="secondary">{interest}</Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Your unique genres */}
                  {scoreData.breakdown.userOnlyGenres && scoreData.breakdown.userOnlyGenres.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Your Unique Genres</h3>
                        <div className="flex flex-wrap gap-2">
                          {scoreData.breakdown.userOnlyGenres.map((g, i) => (
                            <Badge key={i} variant="outline" className="bg-primary/5">{g}</Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Their unique genres */}
                  {scoreData.breakdown.otherOnlyGenres && scoreData.breakdown.otherOnlyGenres.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">{match.name}&apos;s Unique Genres</h3>
                        <div className="flex flex-wrap gap-2">
                          {scoreData.breakdown.otherOnlyGenres.map((g, i) => (
                            <Badge key={i} variant="outline" className="bg-accent/5">{g}</Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Unable to load compatibility details</p>
          </div>
        )}

        {/* ③ CTA strip — Velour pill actions */}
        <div
          className="shrink-0 p-3 flex items-center gap-3"
          style={{
            borderTop: '1px solid var(--v-border)',
            background: 'rgba(27,15,26,.82)',
            backdropFilter: 'blur(12px)',
          }}>
          {onPass && (
            <Button
              variant="outline"
              onClick={onPass}
              className="flex-1 rounded-full italic"
              style={{
                background: 'rgba(212,134,128,.08)',
                border: '1px solid rgba(212,134,128,.35)',
                color: 'var(--v-red)',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
              }}>
              <X className="h-5 w-5 mr-1" />
              Pass
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
            style={{ color: 'var(--v-fg-muted)' }}
            aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
          {onLike && (
            <Button onClick={onLike} className="flex-1 rounded-full v-cta-gold">
              <Heart className="h-5 w-5 mr-1" />
              Like
            </Button>
          )}
          {!onLike && !onPass && (
            <Button onClick={onClose} className="w-full rounded-full v-cta-gold">
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
