// Phase 3: Matching Algorithm Types

// Compatibility level - matches backend enum: LOW, MEDIUM, HIGH, VERY_HIGH
export type CompatibilityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export type SwipeAction = 'like' | 'pass' | 'super_like' | 'block';
export type MatchStatus = 'active' | 'unmatched' | 'deleted' | 'blocked';
export type MatchStatusFilter = 'active' | 'all';

// Shared Genre Breakdown
export type SharedGenre = {
  genre: string;
  genreDisplayName: string;
  userWeight: number;
  otherWeight: number;
  overlap: number;
  similarity: number;
};

// Match Score Response
export type MatchScoreDto = {
  userId: string;
  otherUserId: string;
  overallScore: number; // 0-100
  musicScore: number;
  lifestyleScore: number;
  interestsScore: number;
  locationScore: number;
  behavioralScore: number;
  compatibilityLevel: CompatibilityLevel;
  calculatedAt: string;
  insights: string[];
  breakdown?: {
    sharedGenres: SharedGenre[];
    userOnlyGenres: string[];
    otherOnlyGenres: string[];
    sharedGenreCount: number;
    totalUniqueGenres: number;
    genreOverlapScore: number;
    weightSimilarityScore: number;
    diversityScore: number;
    matchConfidence: number;
    sharedInterests: string[];
    lifestyleCompatibilityScore: number;
  };
};

// Potential Match (from GET /matching/potential)
export type PotentialMatchDto = {
  userId: string;
  name: string;
  age: number;
  photos: string[];
  matchScore: number;
  topSharedGenres: string[];
  distance?: number;
  previewInsight: string;
  compatibilityLevel?: CompatibilityLevel;
  sharedGenreCount?: number;
  bio?: string;
  city?: string;
  country?: string;
};

// Potential Matches Response
export type PotentialMatchesResponseDto = {
  matches: PotentialMatchDto[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

// Swipe Request
export type SwipeRequestDto = {
  swipedUserId: string;
  action: SwipeAction;
  matchScore?: number;
  platform?: string;
};

// Embedded match object inside SwipeResult (from POST /matching/swipe)
export type MatchDto = {
  matchId: string;
  userId: string;   // the other user's id
  name: string;     // the other user's name
  matchScore: number;
  matchedAt: string;
  photos?: string[];
  sharedGenres?: string[];
};

// Swipe Response
export type SwipeResponseDto = {
  swipeId: string;
  action: SwipeAction;
  matchScore?: number;
  resultedInMatch: boolean;
  match?: MatchDto;
};

// Match list item (from GET /matching/matches)
export type MatchListItemDto = {
  matchId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto?: string;
  matchScore: number | null; // null when reverse score not yet computed
  status: string;
  conversationStarted: boolean;
  matchSource: string; // 'mutual_swipe' | 'super_like' | 'algorithm_boost'
  matchedAt: string;
};

// Matches Response
export type MatchesResponseDto = {
  matches: MatchListItemDto[];
  total: number;
  hasMore: boolean;
};

// Match Analytics
export type MatchAnalyticsDto = {
  totalSwipes: number;
  totalLikes: number;
  totalPasses: number;
  swipeThroughRate: number;
  totalMatches: number;
  matchRate: number;
};
