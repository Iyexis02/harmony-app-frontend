# Phase 2 Implementation Guide

## ✅ What's Already Implemented

### Existing Components
1. **MusicPreferencesStep** ([app/onboarding/components/steps/MusicPreferencesStep.tsx](app/onboarding/components/steps/MusicPreferencesStep.tsx))
   - Genre selection with search
   - Spotify-derived recommendations
   - Already integrated into onboarding flow
   - Saves to `/api/v1/onboarding/music-preferences` endpoint

### Backend Integration
- Onboarding already uses music preferences API
- Server actions for saving preferences exist
- Genre categorization and search functionality exists

## 🆕 Phase 2 Additions (Just Implemented)

### 1. Type Definitions ([types/phase2.d.ts](types/phase2.d.ts))
Complete TypeScript types for:
- `GenrePreferenceDto` - Individual preference with weight, rank, source
- `UserGenrePreferencesResponseDto` - List of user preferences
- API request/response types for all Phase 2 endpoints
- Test API types

### 2. Custom Hook ([app/hooks/usePreferences.ts](app/hooks/usePreferences.ts))
Fully functional hook with methods:
- `fetchPreferences(limit)` - GET user preferences
- `addPreference(genreName, weight)` - POST new preference
- `removePreference(genreName)` - DELETE preference
- `syncSpotify(quick)` - POST sync from Spotify
- `clearSpotifyPreferences()` - DELETE Spotify-derived preferences

**Usage:**
```typescript
import { usePreferences } from '@/app/hooks/usePreferences';

function MyComponent() {
  const {
    preferences,      // Array of GenrePreferenceDto
    loading,         // boolean
    error,           // string | null
    fetchPreferences,
    addPreference,
    removePreference,
    syncSpotify,
    clearSpotifyPreferences
  } = usePreferences();

  // Auto-fetches on mount when user is authenticated
  // All methods handle loading/error states automatically
}
```

## 📋 Integration Plan

### Approach 1: Enhance Existing System (Recommended)

The current `MusicPreferencesStep` can be enhanced to use Phase 2 APIs:

#### Step 1: Update Music Preferences Step

Modify `MusicPreferencesStep.tsx` to:

1. **Add Spotify Sync Button**
   ```typescript
   const { syncSpotify, loading: syncing } = usePreferences();

   const handleSpotifySync = async () => {
     const result = await syncSpotify(false); // full sync
     if (result) {
       // Preferences automatically populated
       // Show success message
     }
   };
   ```

2. **Save Individual Preferences**
   ```typescript
   const { addPreference } = usePreferences();

   const handleSaveGenre = async (genreName: string) => {
     await addPreference(genreName, 1.0); // equal weight
   };
   ```

3. **Check for Existing Preferences**
   ```typescript
   const { preferences, loading } = usePreferences();

   useEffect(() => {
     if (preferences.length > 0) {
       // Pre-populate form with existing preferences
       form.setValue('favoriteGenres', preferences.map(p => p.genreName));
     }
   }, [preferences]);
   ```

### Approach 2: Separate Spotify vs Manual Flow

Create two distinct paths as described in Phase 2 instructions:

#### Option A: Connect Spotify
1. User clicks "Connect Spotify"
2. OAuth flow completes
3. Call `syncSpotify()` to extract preferences
4. Show extracted preferences with weights
5. Allow editing/removal

#### Option B: Manual Selection
1. User clicks "Select Manually"
2. Show genre grid (similar to existing)
3. Call `addPreference()` for each selected genre
4. Equal weights assigned

## 🎯 Next Steps for Full Phase 2

### 1. Profile Display Component

Create a component to show user's music preferences on their profile:

**File:** `app/components/profile/MusicPreferencesSection.tsx` (See example below)

### 2. Edit Preferences Page

**Route:** `/preferences/edit`

Features needed:
- List current preferences with remove buttons
- Add new genres
- Re-sync Spotify button
- Weight adjustment (optional)

**Implementation:**
```typescript
'use client';

import { usePreferences } from '@/app/hooks/usePreferences';

export default function EditPreferencesPage() {
  const {
    preferences,
    loading,
    addPreference,
    removePreference,
    syncSpotify,
  } = usePreferences();

  // UI for managing preferences
}
```

### 3. Spotify OAuth Enhancement

The app already has Spotify OAuth in:
- `app/api/spotify/connect/route.ts`
- `app/api/spotify/connect/callback/route.ts`

Enhance the callback to trigger preference sync:
```typescript
// In callback route
if (spotifyConnected) {
  // Trigger initial sync
  await syncUserPreferences(userId);
}
```

## 🔧 API Endpoints Reference

### Production (Requires JWT)

```bash
# Get preferences
GET /api/v1/preferences/genres?limit=20
Headers: Authorization: Bearer {token}

# Add preference
POST /api/v1/preferences/genres
Headers: Authorization: Bearer {token}
Body: {"genreName": "rock", "weight": 0.9}

# Remove preference
DELETE /api/v1/preferences/genres/{genreName}
Headers: Authorization: Bearer {token}

# Sync from Spotify
POST /api/v1/preferences/genres/sync?quick=false
Headers: Authorization: Bearer {token}

# Clear Spotify preferences
DELETE /api/v1/preferences/genres/spotify
Headers: Authorization: Bearer {token}
```

### Test (No Auth - Development Only)

```bash
# Extract from mock data
POST /api/test/phase2/extract-mock?userId={userId}

# Test weight calculator
GET /api/test/phase2/calculate-weight?frequency=10&total=50

# Add manual preference (test)
POST /api/test/phase2/add-manual?userId={userId}&genreName=rock&weight=0.9

# Get top genres
GET /api/test/phase2/top-genres?userId={userId}&limit=5

# Clear preferences
DELETE /api/test/phase2/clear?userId={userId}

# Test Spotify sync
POST /api/test/phase2/sync-spotify?userId={userId}&quick=false
```

## 🎨 UI Components Needed

### 1. Spotify Connect Card
- Large "Connect Spotify" button
- Privacy information
- OAuth redirect handling
- Sync progress indicator

### 2. Genre Preference Display
- Top 5 genres with percentages
- Ranked list view
- Badge/chip design
- Edit functionality

### 3. Manual Genre Selector
- Grid of all genres
- Multi-select functionality
- Search/filter
- Category organization (already exists!)

### 4. Preference Management
- Add/remove buttons
- Weight sliders (optional)
- Source indicators (Spotify vs Manual)
- Re-sync button

## 📊 Data Flow

```
User Completes Onboarding (Music Step)
  ↓
Option 1: Spotify Path
  - Click "Sync from Spotify"
  - POST /api/v1/preferences/genres/sync
  - Backend extracts genres from Spotify data
  - Preferences auto-saved with weights
  - Display on profile

Option 2: Manual Path
  - Select genres from UI
  - POST /api/v1/preferences/genres (for each)
  - Equal weights assigned
  - Display on profile

Profile View
  - GET /api/v1/preferences/genres
  - Display top genres with ranks
  - Edit button → /preferences/edit

Edit Preferences
  - View all preferences
  - Add: POST /api/v1/preferences/genres
  - Remove: DELETE /api/v1/preferences/genres/{name}
  - Re-sync: POST /api/v1/preferences/genres/sync
```

## 🐛 Error Handling

The `usePreferences` hook automatically handles:
- Network errors
- Authentication errors (no token)
- HTTP errors (non-200 responses)
- JSON parsing errors

All errors are stored in the `error` state variable.

Example error handling:
```typescript
const { error, addPreference } = usePreferences();

const handleAdd = async () => {
  const success = await addPreference('rock', 0.9);
  if (!success && error) {
    toast.error(error); // Using your toast library
  }
};
```

## 🚀 Quick Start Checklist

- [x] Phase 2 types created
- [x] usePreferences hook created
- [ ] Add Spotify sync button to onboarding
- [ ] Create profile music section
- [ ] Create edit preferences page
- [ ] Test with real Spotify OAuth
- [ ] Test manual preference flow
- [ ] Add loading states
- [ ] Add error toasts
- [ ] Test re-sync functionality

## 📝 Notes

1. **Existing vs New**: The current music preferences system saves to the onboarding endpoint. Phase 2 uses a different endpoint (`/api/v1/preferences/genres`). You may want to:
   - Migrate to the new endpoint
   - Or keep both and sync between them

2. **Spotify Token**: Ensure `accessToken` is in the Next-Auth session for JWT authentication.

3. **Source Tracking**: Phase 2 tracks whether preferences came from Spotify or manual selection. Use this to:
   - Show different UI indicators
   - Preserve manual additions during re-sync
   - Display source on profile

4. **Weights**: Spotify-derived preferences have calculated weights (0-1). Manual selections default to 1.0 but can be adjusted.

## 🔗 Related Files

- [types/phase2.d.ts](types/phase2.d.ts) - Type definitions
- [app/hooks/usePreferences.ts](app/hooks/usePreferences.ts) - Preferences hook
- [app/onboarding/components/steps/MusicPreferencesStep.tsx](app/onboarding/components/steps/MusicPreferencesStep.tsx) - Existing music step
- [FRONTEND_PHASE2_INSTRUCTIONS.md](C:\Users\MladenHangi\Downloads\dating\dating\FRONTEND_PHASE2_INSTRUCTIONS.md) - Original specs
