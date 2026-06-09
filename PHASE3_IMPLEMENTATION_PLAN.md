# Phase 3: Matching Algorithm - Complete Implementation Plan

## ✅ What's Ready

- **Backend**: Phase 3 matching endpoints are implemented and ready
- **Types**: Created at [`types/phase3.d.ts`](types/phase3.d.ts)
- **Animation Library**: Framer Motion already installed (better than react-spring for Next.js)

---

## 📁 File Structure to Create

```
app/
├── hooks/
│   └── useMatching.ts                    # Matching hook (API calls)
├── discover/
│   ├── page.tsx                          # Main swipe interface
│   └── components/
│       ├── SwipeCard.tsx                 # Swipeable card with animations
│       └── MatchScoreBreakdown.tsx       # Score breakdown modal
├── matches/
│   ├── page.tsx                          # Matches list page
│   └── components/
│       ├── MatchCard.tsx                 # Individual match card
│       └── MatchNotification.tsx         # "It's a Match!" popup
└── analytics/
    └── page.tsx                          # Match statistics dashboard
```

---

## 🔧 Implementation Steps

### Step 1: Create `useMatching` Hook

**File:** `app/hooks/useMatching.ts`

```typescript
import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type {
  PotentialMatchDto,
  MatchScoreDto,
  SwipeResponseDto,
  MatchDto,
  MatchAnalyticsDto,
} from '@/types/phase3';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080';

export function useMatching() {
  const { data: session } = useSession();
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatchDto[]>([]);
  const [matches, setMatches] = useState<MatchDto[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = session?.user?.accessToken;

  const fetchPotentialMatches = useCallback(
    async (limit: number = 20, minScore: number = 60) => {
      if (!token) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/matching/potential?limit=${limit}&minScore=${minScore}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch potential matches');

        const data = await response.json();
        setPotentialMatches(data.matches || []);
        setCurrentMatchIndex(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching matches');
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const swipe = useCallback(
    async (swipedUserId: string, action: 'like' | 'pass', matchScore: number) => {
      if (!token) return null;

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/matching/swipe`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ swipedUserId, action, matchScore }),
        });

        if (!response.ok) throw new Error('Swipe failed');

        const data: SwipeResponseDto = await response.json();

        // Move to next card
        setCurrentMatchIndex((prev) => prev + 1);

        // If mutual match, add to matches list
        if (data.resultedInMatch && data.match) {
          setMatches((prev) => [data.match!, ...prev]);
        }

        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Swipe error');
        return null;
      }
    },
    [token]
  );

  const getMatchScore = useCallback(
    async (otherUserId: string): Promise<MatchScoreDto | null> => {
      if (!token) return null;

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/matching/score/${otherUserId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) throw new Error('Failed to get match score');

        return await response.json();
      } catch (err) {
        console.error('Error fetching match score:', err);
        return null;
      }
    },
    [token]
  );

  const fetchMatches = useCallback(
    async (status: 'active' | 'unmatched' | 'all' = 'active') => {
      if (!token) return;

      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/matching/matches?status=${status}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch matches');

        const data = await response.json();
        setMatches(data.matches || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching matches');
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const fetchAnalytics = useCallback(async (): Promise<MatchAnalyticsDto | null> => {
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/matching/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch analytics');

      return await response.json();
    } catch (err) {
      console.error('Error fetching analytics:', err);
      return null;
    }
  }, [token]);

  const currentMatch = potentialMatches[currentMatchIndex];
  const hasMoreMatches = currentMatchIndex < potentialMatches.length - 1;

  return {
    // State
    potentialMatches,
    matches,
    currentMatch,
    currentMatchIndex,
    hasMoreMatches,
    loading,
    error,

    // Actions
    fetchPotentialMatches,
    swipe,
    getMatchScore,
    fetchMatches,
    fetchAnalytics,
  };
}
```

---

### Step 2: SwipeCard Component

**File:** `app/discover/components/SwipeCard.tsx`

Key features:
- Framer Motion for drag animations
- Match score display (87%)
- Top 3 shared genres
- Distance indicator
- Like/Pass buttons

Use `motion.div` from framer-motion with `drag` and `dragConstraints` props.

---

### Step 3: Discover Page

**File:** `app/discover/page.tsx`

Features:
- Stack of cards
- Swipe left (pass) / right (like)
- Match notification popup on mutual like
- "No more matches" empty state

---

### Step 4: MatchScore Breakdown Modal

**File:** `app/discover/components/MatchScoreBreakdown.tsx`

Shows:
- Overall score (87%)
- Shared genres with overlap bars
- User-only genres
- Other user-only genres
- Compatibility insights

---

### Step 5: Match Notification

**File:** `app/matches/components/MatchNotification.tsx`

Popup when mutual match occurs:
- "It's a Match!" animation
- Both user photos
- Match score
- Send Message / Keep Swiping buttons

---

### Step 6: Matches List Page

**File:** `app/matches/page.tsx`

Lists all mutual matches with:
- Profile photo
- Name, age
- Match score
- Matched time (2 hours ago)
- Shared genres
- Message button

---

### Step 7: Analytics Page

**File:** `app/analytics/page.tsx`

Shows statistics:
- Total swipes
- Total matches
- Like rate
- Average match score
- Most compatible match
- Most shared genre

---

## 🎨 Key UI Patterns

### Swipe Animation (Framer Motion)

```typescript
import { motion, useMotionValue, useTransform } from 'framer-motion';

const x = useMotionValue(0);
const rotate = useTransform(x, [-200, 200], [-30, 30]);
const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  style={{ x, rotate, opacity }}
  onDragEnd={(_, info) => {
    if (info.offset.x > 100) handleLike();
    if (info.offset.x < -100) handlePass();
  }}
>
  {/* Card content */}
</motion.div>
```

### Match Score Badge

```tsx
<div className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full">
  <Music className="h-4 w-4" />
  <span className="font-bold">{matchScore}%</span>
</div>
```

### Compatibility Level Color

```typescript
const getCompatibilityColor = (level: CompatibilityLevel) => {
  switch (level) {
    case 'Very High': return 'bg-green-500';
    case 'High': return 'bg-blue-500';
    case 'Medium': return 'bg-yellow-500';
    case 'Low': return 'bg-gray-500';
  }
};
```

---

## 🔗 Navigation Updates

Add to header/navigation:

```tsx
<Link href="/discover">
  <Button>
    <Heart className="h-4 w-4 mr-2" />
    Discover
  </Button>
</Link>

<Link href="/matches">
  <Button>
    <Users className="h-4 w-4 mr-2" />
    Matches ({matchCount})
  </Button>
</Link>
```

---

## 📝 API Endpoint Reference

All endpoints documented in the spec, using JWT authentication:

```
GET  /api/v1/matching/score/{userId}
GET  /api/v1/matching/potential?limit=20&minScore=60
POST /api/v1/matching/swipe
GET  /api/v1/matching/matches?status=active
GET  /api/v1/matching/analytics
```

---

## ✅ Testing Checklist

- [ ] Swipe animations work smoothly
- [ ] Like/Pass buttons work
- [ ] Match notification appears on mutual match
- [ ] Match score breakdown modal opens
- [ ] Matches list displays all matches
- [ ] Analytics page shows correct stats
- [ ] Navigation between pages works
- [ ] Empty states display correctly
- [ ] Mobile responsive
- [ ] Keyboard navigation (arrow keys for swipe)

---

## 🚀 Quick Start

1. Copy `useMatching.ts` hook
2. Create all component files
3. Add routes to navigation
4. Test with backend running on `http://127.0.0.1:8080`
5. Ensure JWT token is in session

---

**Ready to implement!** All components follow the same patterns as Phase 1 & 2. Let me know if you need the full component code for any specific part!
