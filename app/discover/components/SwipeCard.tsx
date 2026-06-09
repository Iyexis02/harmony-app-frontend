'use client';

import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import { ChevronLeft, ChevronRight, Info, MapPin, Music } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cardExit } from '@/lib/motion';
import { getScoreLabel, getScoreStrokeColor } from '@/lib/profileHelpers';
import type { PotentialMatchDto, SwipeAction } from '@/types/phase3';
import type { SwipeDirection } from '../page';

type Props = {
  match: PotentialMatchDto;
  onSwipe: (action: SwipeAction) => void;
  onShowDetails: () => void;
  exitDirection?: SwipeDirection;
};

function getVelourScoreLabel(score: number): string {
  if (score >= 80) return 'Rare harmony';
  if (score >= 60) return 'A promising duet';
  if (score >= 40) return 'A curious overture';
  return 'A distant echo';
}

export default function SwipeCard({ match, onSwipe, onShowDetails, exitDirection }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-20, 0, 20]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  const likeOpacity = useTransform(x, [50, 150], [0, 1]);
  const passOpacity = useTransform(x, [-150, -50], [1, 0]);

  const photos = match.photos && match.photos.length > 0 ? match.photos : [];
  const [photoIndex, setPhotoIndex] = useState(0);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      onSwipe('like');
    } else if (info.offset.x < -threshold) {
      onSwipe('pass');
    }
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((i) => Math.max(0, i - 1));
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((i) => Math.min(photos.length - 1, i + 1));
  };

  const scoreColor = getScoreStrokeColor(match.matchScore);

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      style={{ x, rotate, opacity }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.97, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={cardExit(exitDirection ?? null)}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing">
      {/* Stacked shadow layer — subtle oxblood glow underneath */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: 'translateY(14px) scale(0.965)',
          borderRadius: 22,
          background: 'var(--v-card-2)',
          border: '1px solid var(--v-row-border)',
          opacity: 0.65,
          filter: 'blur(.5px)',
        }}
      />

      <div
        className="relative h-full w-full overflow-hidden"
        style={{
          borderRadius: 22,
          background: 'var(--v-card)',
          border: '1px solid var(--v-border)',
          boxShadow: 'var(--v-shadow-card)',
        }}>
        {/* Gold top hairline */}
        <div
          className="absolute"
          style={{
            top: 0,
            left: '10%',
            right: '10%',
            height: 1,
            background:
              'linear-gradient(90deg, transparent, rgba(232,177,92,.6), transparent)',
            zIndex: 2,
          }}
        />

        {/* Main Photo */}
        <div
          className="relative h-2/3"
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
              <Music style={{ width: 96, height: 96, color: 'var(--v-fg-faint)' }} />
            </div>
          )}

          {/* Photo Carousel Dots */}
          {photos.length > 1 && (
            <div className="absolute top-3 left-0 right-0 flex justify-center gap-1 px-4 z-10">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setPhotoIndex(i); }}
                  aria-label={`Photo ${i + 1}`}
                  className="h-[3px] rounded-full transition-all"
                  style={{
                    width: i === photoIndex ? 28 : 16,
                    background: i === photoIndex ? 'var(--v-gold)' : 'rgba(242,232,220,.35)',
                  }}
                />
              ))}
            </div>
          )}

          {/* Photo Prev/Next */}
          {photos.length > 1 && (
            <>
              {photoIndex > 0 && (
                <button
                  onClick={prevPhoto}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full transition-colors z-10"
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full transition-colors z-10"
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

          {/* Compatibility Ring — gold halo on wine disc */}
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowDetails();
              }}
              className="relative w-14 h-14 hover:scale-110 transition-transform"
              style={{
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,.5))',
              }}
              aria-label={`Compatibility: ${match.matchScore}%, ${getScoreLabel(match.matchScore)} match. Tap for details`}
            >
              <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="rgba(27,15,26,.75)"
                  stroke="rgba(232,177,92,.18)"
                  strokeWidth="3"
                />
                <motion.circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  style={{ stroke: scoreColor }}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 24 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 24 * (1 - match.matchScore / 100) }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                />
              </svg>
              <span
                className="absolute inset-0 flex items-center justify-center font-bold leading-none"
                style={{
                  color: 'var(--v-fg)',
                  fontSize: 12,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                {Math.round(match.matchScore)}%
              </span>
            </button>
          </div>

          {/* Gradient Overlay — wine fade for legibility */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: 144,
              background:
                'linear-gradient(to top, rgba(27,15,26,.92) 0%, rgba(27,15,26,.65) 40%, transparent 100%)',
            }}
          />

          {/* Name and Age */}
          <div className="absolute bottom-4 left-5 right-5 z-[1]">
            <h2
              className="v-display"
              style={{
                fontSize: 32,
                fontWeight: 500,
                color: 'var(--v-fg)',
                textShadow: '0 2px 12px rgba(0,0,0,.6)',
                lineHeight: 1.05,
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
                <span>{match.distance?.toFixed(1)} km away</span>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="h-1/3 p-5 space-y-2.5 overflow-hidden">
          {/* Compatibility — editorial label */}
          <div className="flex items-start justify-between">
            <div>
              <p
                className="v-mono"
                style={{ fontSize: 9.5, color: 'var(--v-fg-faint)' }}>
                compatibility
              </p>
              <p
                className="v-display v-italic"
                style={{
                  fontSize: 19,
                  fontWeight: 500,
                  color: scoreColor,
                  lineHeight: 1.2,
                  marginTop: 2,
                }}>
                {getVelourScoreLabel(match.matchScore)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onShowDetails();
              }}
              className="italic shrink-0"
              style={{
                color: 'var(--v-gold-light)',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                background: 'rgba(232,177,92,.06)',
                border: '1px solid var(--v-border)',
                borderRadius: 9999,
              }}>
              <Info className="h-3.5 w-3.5 mr-1.5" />
              Details
            </Button>
          </div>

          {/* Bio / Preview */}
          {match.bio ? (
            <p
              className="line-clamp-2"
              style={{
                fontSize: 13.5,
                color: 'var(--v-fg-muted)',
                lineHeight: 1.5,
              }}>
              {match.bio}
            </p>
          ) : match.previewInsight ? (
            <p
              className="line-clamp-1 v-italic"
              style={{
                fontSize: 13.5,
                color: 'var(--v-fg-muted)',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
              }}>
              &ldquo;{match.previewInsight}&rdquo;
            </p>
          ) : null}

          {/* Top Shared Genres — mono pills on wine */}
          {match.topSharedGenres && match.topSharedGenres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {match.topSharedGenres.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="v-mono"
                  style={{
                    fontSize: 9.5,
                    padding: '3px 10px',
                    borderRadius: 9999,
                    background: 'rgba(232,177,92,.08)',
                    color: 'var(--v-gold-light)',
                    border: '1px solid rgba(232,177,92,.2)',
                  }}>
                  {genre}
                </span>
              ))}
              {match.topSharedGenres.length > 3 && (
                <span
                  className="v-mono"
                  style={{
                    fontSize: 9.5,
                    padding: '3px 10px',
                    borderRadius: 9999,
                    background: 'transparent',
                    color: 'var(--v-fg-muted)',
                    border: '1px solid var(--v-border)',
                  }}>
                  +{match.topSharedGenres.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Swipe Indicators — Velour stamps */}
        <motion.div
          style={{
            opacity: likeOpacity,
            color: 'var(--v-gold)',
            background: 'rgba(232,177,92,.12)',
            border: '2px solid var(--v-gold)',
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontStyle: 'italic',
            letterSpacing: '.02em',
          }}
          className="absolute top-14 right-8 px-5 py-2.5 rounded-lg font-bold text-2xl rotate-12 pointer-events-none backdrop-blur-sm">
          Yes
        </motion.div>
        <motion.div
          style={{
            opacity: passOpacity,
            color: 'var(--v-red)',
            background: 'rgba(212,134,128,.12)',
            border: '2px solid var(--v-red)',
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontStyle: 'italic',
            letterSpacing: '.02em',
          }}
          className="absolute top-14 left-8 px-5 py-2.5 rounded-lg font-bold text-2xl -rotate-12 pointer-events-none backdrop-blur-sm">
          Not tonight
        </motion.div>
      </div>
    </motion.div>
  );
}
