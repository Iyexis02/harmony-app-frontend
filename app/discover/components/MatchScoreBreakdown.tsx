'use client';

import { Loader2, Music, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useMatching } from '@/app/hooks/useMatching';
import { getScoreTextColor, getScoreLevelBadgeClass } from '@/lib/profileHelpers';
import type { MatchScoreDto } from '@/types/phase3';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
};

export default function MatchScoreBreakdown({ isOpen, onClose, userId, userName }: Props) {
  const { getMatchScore } = useMatching();
  const [scoreData, setScoreData] = useState<MatchScoreDto | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadScoreData = async () => {
      setLoading(true);
      const data = await getMatchScore(userId);
      setScoreData(data);
      setLoading(false);
    };

    if (isOpen && userId) {
      loadScoreData();
    }
  }, [isOpen, userId, getMatchScore]);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            Match with {userName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : scoreData ? (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className={`text-center py-6 rounded-xl border-2 ${getScoreLevelBadgeClass(scoreData.compatibilityLevel)}`}>
              <p className="text-sm font-medium mb-2">Overall Compatibility</p>
              <p className={`text-5xl font-bold ${getScoreTextColor(scoreData.overallScore)}`}>
                {Math.round(scoreData.overallScore)}%
              </p>
              <p className="text-lg font-semibold mt-2">{scoreData.compatibilityLevel} Match</p>
            </div>

            {/* Insights */}
            {scoreData.insights && scoreData.insights.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="font-semibold text-primary mb-2">💡 Insights</p>
                <ul className="space-y-1">
                  {scoreData.insights.map((insight, index) => (
                    <li key={index} className="text-sm text-foreground/80">
                      • {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Separator />

            {/* Shared Genres */}
            {scoreData.breakdown?.sharedGenres && scoreData.breakdown.sharedGenres.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4">🎵 What You Share</h3>
                <div className="space-y-4">
                  {scoreData.breakdown.sharedGenres.map((genre, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold">{genre.genre}</p>
                        <Badge variant="secondary">{Math.round(genre.overlap * 100)}% overlap</Badge>
                      </div>

                      {/* Your preference */}
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>You</span>
                            <span>{Math.round(genre.userWeight * 100)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${genre.userWeight * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Their preference */}
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>{userName}</span>
                            <span>{Math.round(genre.otherWeight * 100)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all"
                              style={{ width: `${genre.otherWeight * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Your Unique Genres */}
            {scoreData.breakdown?.userOnlyGenres && scoreData.breakdown.userOnlyGenres.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Your Unique Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {scoreData.breakdown.userOnlyGenres.map((genre, index) => (
                      <Badge key={index} variant="outline" className="bg-primary/5">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Their Unique Genres */}
            {scoreData.breakdown?.otherOnlyGenres && scoreData.breakdown.otherOnlyGenres.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">{userName}&apos;s Unique Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {scoreData.breakdown.otherOnlyGenres.map((genre, index) => (
                      <Badge key={index} variant="outline" className="bg-accent/5">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Music Score Detail */}
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Music Compatibility Score</span>
              <span className={`font-bold ${getScoreTextColor(scoreData.musicScore)}`}>
                {Math.round(scoreData.musicScore)}%
              </span>
            </div>

            {/* Close Button */}
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Unable to load match score details</p>
            <Button onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
