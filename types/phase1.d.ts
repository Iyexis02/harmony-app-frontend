// Phase 1: Genre Database Types

export type GenreDto = {
  id: string;
  name: string;
  displayName: string;
  isPrimary: boolean;
  parentGenre: string | null; // Now a string (parent's displayName) instead of an object
};

export type GenreWithChildrenDto = {
  id: string;
  name: string;
  displayName: string;
  isPrimary: boolean;
  parentGenre: string | null;
  children?: GenreDto[];
};

export type GenresResponseDto = {
  total: number;
  genres: GenreDto[];
};

export type GenreDetailResponseDto = {
  genre: GenreDto;
  children: GenreDto[];
  childCount: number;
};

export type GenreHierarchyResponseDto = {
  topLevelCount: number;
  hierarchy: GenreWithChildrenDto[];
};

// User Genre Preferences
export type UserGenrePreferenceDto = {
  id: string;
  genre: GenreDto;
  weight: number;
  source: string;
  confidence: number;
  rank: number;
};

export type AddUserGenrePreferenceRequestDto = {
  genreName: string;
  weight: number;
  source: string;
};

export type AddUserGenrePreferenceResponseDto = {
  message: string;
  preference: UserGenrePreferenceDto;
};

export type UserGenrePreferencesResponseDto = {
  userId: string;
  totalGenres: number;
  preferences: UserGenrePreferenceDto[];
};

// Swipe Types
export type SwipeDto = {
  id: string;
  action: 'like' | 'pass';
  swipedAt: string;
  matchScore: number;
  resultedInMatch: boolean;
};

export type UserSwipesResponseDto = {
  userId: string;
  totalSwipes: number;
  likes: number;
  passes: number;
  swipeThroughRate: number;
  matchRate: number;
  swipes: SwipeDto[];
};

export type RecordSwipeRequestDto = {
  swiperId: string;
  swipedId: string;
  action: 'like' | 'pass';
  score: number;
};

// Match Types
export type MatchDto = {
  id: string;
  matchedAt: string;
  matchScore: number;
  status: string;
  conversationStarted: boolean;
  matchSource: string;
};

export type RecordSwipeResponseDto = {
  swipe: SwipeDto;
  mutualMatch: boolean;
  match?: MatchDto;
};

export type UserMatchesResponseDto = {
  userId: string;
  totalMatches: number;
  withConversation: number;
  withoutConversation: number;
  matches: MatchDto[];
};

export type CheckMatchResponseDto = {
  user1Id: string;
  user2Id: string;
  matched: boolean;
  match?: MatchDto;
};

// Phase 1 Statistics (from /api/test/phase1/stats endpoint)
export type Phase1StatsResponseDto = {
  genres: {
    total: number;
    primary: number;
    topLevel: number;
  };
  users: {
    totalUsers: number;
    usersWithGenrePreferences: number;
  };
  swipes: {
    total: number;
  };
  matches: {
    total: number;
  };
};
