# Dating App Project - Current Status & Context

**Last Updated**: 2026-03-09
**Project**: Music-based Dating Application
**Status**: 🟢 Active Development

---

## 📋 Quick Overview

Full-stack music-based dating application that matches users based on their Spotify music preferences, location, and lifestyle compatibility.

**Frontend** (Next.js - This Repository): Next.js 15, React 19, TypeScript, Radix UI + Tailwind CSS (shadcn/ui), React Hook Form + Zod, NextAuth v4 (Spotify OAuth), Cloudinary

**Backend** (Spring Boot - Separate Repository): Running at `http://localhost:8080`, API Base: `/api/v1`. See `ONBOARDING_DTOS.md` for complete onboarding API specification.

---

## ✅ Implementation Status

### Phase 1 — Onboarding (Complete)

- All 8 onboarding steps fully implemented
- TypeScript types aligned with backend DTOs (`types/onboarding.d.ts`)
- Server actions in `app/serverActions/onboarding.ts`
- Cloudinary photo upload working
- Spotify OAuth integration active
- Form validation with Zod, auto-save via `useAutoSave` hook (2s debounce)
- Progress tracking integrated with backend `registrationStage`

### Phase 2 — Genre Preferences (Complete)

- `types/phase2.d.ts` — TypeScript types
- `app/hooks/usePreferences.ts` — CRUD hook for genre preferences
- `app/components/profile/MusicPreferencesDisplay.tsx` — display component
- `app/preferences/edit/page.tsx` — full edit UI with Spotify sync

**Phase 2 API endpoints:**
| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/preferences/genres?limit=20` | Get user's genre preferences |
| `POST /api/v1/preferences/genres` | Add manual preference `{genreName, weight}` |
| `DELETE /api/v1/preferences/genres/{genreName}` | Remove preference |
| `POST /api/v1/preferences/genres/sync?quick=false` | Sync from Spotify |
| `DELETE /api/v1/preferences/genres/spotify` | Clear Spotify-derived preferences |

### Phase 3 — Matching Algorithm (Complete)

- `types/phase3.d.ts` — TypeScript types (`PotentialMatchDto`, `MatchDto`, `SwipeRequestDto`, `MatchAnalyticsDto`, etc.)
- `app/hooks/useMatching.ts` — swipe/match/analytics hook
- `app/discover/` — swipe interface with Framer Motion animations
- `app/matches/` — mutual matches list
- `app/analytics/` — personal stats dashboard
- Navigation updated in `app/components/Header.tsx`

**Phase 3 API endpoints:**
| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/matching/potential?limit=20&minScore=60&excludeSwiped=true` | Get swipe candidates |
| `POST /api/v1/matching/swipe` | Like/Pass — `{userId, action, score}` |
| `GET /api/v1/matching/score/{userId}` | Get detailed match score breakdown |
| `GET /api/v1/matching/matches?status=active` | Get mutual matches |
| `GET /api/v1/matching/analytics` | Get personal swipe/match statistics |

### Profile Refactoring (Complete — 2025-12-17)

Reusable component library created in `app/components/profile/`:
- `ProfileSection`, `InfoItem`, `InfoGrid`, `PhotoGallery`, `BadgeList`, `QuickStats`

Utilities: `lib/profileHelpers.ts` (formatting), `lib/profileConstants.ts` (constants)

---

## 🔐 Environment Configuration

File: `.env.local`

```env
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_API_BASE_URL=https://api.spotify.com/v1
NEXTAUTH_URL=http://127.0.0.1:3000
NEXTAUTH_SECRET=...
BACKEND_API_URL=http://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:8080
JWT_SECRET=...
GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=dating-app-unsigned
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

## 🐛 Known Issues

None currently.

---

## 🚀 Next Steps (Phase 4)

- **Messaging** — real-time chat with matches (WebSocket)
- **Video calls** — face-to-face connections
- **Advanced filters** — more match preference options
- **Profile verification** — verify user authenticity
- **Push notifications** — match and message alerts

---

## 📁 Key File Locations

| File | Purpose |
|------|---------|
| `ONBOARDING_DTOS.md` | Complete onboarding API spec (request/response DTOs) |
| `CLAUDE.md` | Claude Code guidance and architecture overview |
| `types/onboarding.d.ts` | Onboarding TypeScript types |
| `types/phase2.d.ts` | Genre preference types |
| `types/phase3.d.ts` | Matching algorithm types |
| `app/serverActions/onboarding.ts` | Onboarding API calls |
| `app/hooks/usePreferences.ts` | Genre preferences hook |
| `app/hooks/useMatching.ts` | Matching hook |
| `app/enums/user/userEnum.ts` | All enums (Gender, SexualOrientation, RelationshipGoal, etc.) |
| `lib/cloudinary.ts` | Photo upload/delete |
| `lib/profileHelpers.ts` | Formatting utilities |
| `lib/profileConstants.ts` | Profile section config |
