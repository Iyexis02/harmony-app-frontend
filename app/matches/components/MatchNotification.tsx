'use client';

import { motion } from 'framer-motion';
import { Heart, Music, Star, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { MatchDto, SwipeAction } from '@/types/phase3';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  match: MatchDto | null;
  currentUserPhoto?: string;
  swipeAction?: SwipeAction;
};

export default function MatchNotification({ isOpen, onClose, match, currentUserPhoto, swipeAction }: Props) {
  const router = useRouter();
  const isSuperLike = swipeAction === 'super_like';

  if (!match) return null;

  const handleKeepSwiping = () => {
    onClose();
  };

  const handleViewMatch = () => {
    onClose();
    router.push('/matches');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <div
          className="relative p-8"
          style={{
            background: isSuperLike
              ? 'radial-gradient(ellipse at top, rgba(167,211,155,.35), transparent 60%), linear-gradient(135deg, #C87533, #E8B15C)'
              : 'radial-gradient(ellipse at top, rgba(245,215,154,.35), transparent 60%), linear-gradient(135deg, #C87533, #E8B15C)',
          }}>
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Animated Hearts Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ y: '100%', x: `${Math.random() * 100}%`, opacity: 0 }}
                animate={{
                  y: '-100%',
                  opacity: [0, 1, 1, 0],
                  rotate: Math.random() * 360,
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  delay: Math.random() * 2,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 3,
                }}
                className="absolute"
              >
                <Heart className="h-6 w-6 text-white/30 fill-white/30" />
              </motion.div>
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 text-center space-y-6">
            {/* Title */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
            >
              <h2 className="text-4xl font-bold text-white mb-2">
                {isSuperLike ? 'Super Match!' : "It's a Match!"}
              </h2>
              <p className="text-white/90 text-lg">
                {isSuperLike
                  ? `${match.name} super liked you back!`
                  : `You and ${match.name} both liked each other`}
              </p>
            </motion.div>

            {/* Photos */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center items-center gap-4"
            >
              {/* Current User Photo */}
              <motion.div
                initial={{ x: -50 }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', delay: 0.4 }}
                className="relative"
              >
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-primary/30">
                  {currentUserPhoto ? (
                    <Image
                      src={currentUserPhoto}
                      alt="You"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Music className="h-12 w-12 text-white" />
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Heart / Star Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <div className="bg-white rounded-full p-3 shadow-lg">
                  {isSuperLike
                    ? <Star className="h-8 w-8 text-blue-500 fill-blue-500" />
                    : <Heart className="h-8 w-8 text-accent fill-accent" />}
                </div>
              </motion.div>

              {/* Match Photo */}
              <motion.div
                initial={{ x: 50 }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', delay: 0.4 }}
                className="relative"
              >
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-accent/30">
                  {match.photos && match.photos.length > 0 ? (
                    <Image
                      src={match.photos[0]}
                      alt={match.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Music className="h-12 w-12 text-white" />
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>

            {/* Match Score */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="bg-white/20 backdrop-blur-sm rounded-lg p-4"
            >
              <div className="flex items-center justify-center gap-2 text-white">
                <Music className="h-5 w-5" />
                <span className="text-2xl font-bold">
                  {Math.round(match.matchScore)}% Match
                </span>
              </div>
              <p className="text-white/90 text-sm mt-2">
                {match.sharedGenres && match.sharedGenres.length > 0
                  ? `You both love ${match.sharedGenres.slice(0, 2).join(' and ')}${match.sharedGenres.length > 2 ? ' and more' : ''}`
                  : match.matchScore >= 70
                    ? 'You have great music compatibility!'
                    : 'You have music taste in common!'}
              </p>
            </motion.div>

            {/* Action Buttons — View Match is primary CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="flex flex-col gap-3"
            >
              <Button
                onClick={handleViewMatch}
                size="lg"
                className="w-full bg-white text-primary hover:bg-white/90 font-semibold"
              >
                View Match
              </Button>
              <Button
                onClick={handleKeepSwiping}
                size="lg"
                variant="outline"
                className="w-full border-white/50 text-white hover:bg-white/10 hover:text-white"
              >
                Keep Swiping
              </Button>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
