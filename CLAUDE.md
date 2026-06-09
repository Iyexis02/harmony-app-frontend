# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm start        # Start production server
```

No test runner is configured.

## Architecture

**Stack:** Next.js 15 (App Router) · TypeScript · React 19 · NextAuth v4 · Tailwind CSS v4 · shadcn-ui · Radix UI · React Hook Form · Zod · Framer Motion · Cloudinary · Sonner (toasts)

**Backend:** Spring Boot API at `process.env.BACKEND_API_URL` (default: `http://localhost:8080`). All data mutations go through server actions that call this backend — there is no database in this Next.js app.

### Authentication

NextAuth with two providers:
- **Credentials** (email/password) — backend issues a JWT stored as `session.accessToken`
- **Spotify OAuth** — Spotify access token + app JWT both stored; tokens auto-refreshed in `jwt` callback

Session shape extended in [next-auth.d.ts](next-auth.d.ts): `accessToken`, `userId`, `emailVerified`, `authProvider`, `registrationStage`.

All server actions attach `Authorization: Bearer ${session.accessToken}` to backend requests.

### Data Flow Pattern

Server actions in [app/serverActions/](app/serverActions/) return a discriminated union:
```ts
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { status: number; message: string } }
```
Use this pattern consistently for all new backend calls.

### Onboarding

8-step progressive flow controlled by `registrationStage` (enum in [app/enums/user/userEnum.ts](app/enums/user/userEnum.ts)):
`STARTED → BASIC_PROFILE → LOCATION_INFO → PHOTOS → MUSIC_PREFERENCES → LIFESTYLE → PERSONALITY → DATING_PREFERENCES → PRIVACY_SETTINGS → FINISHED`

Each step is a component in [app/onboarding/components/steps/](app/onboarding/components/steps/). The `useAutoSave<T>` hook (2s debounce) is used throughout for auto-saving form data. See [ONBOARDING_DTOS.md](ONBOARDING_DTOS.md) for full request/response DTO schemas.

### Key Files & Directories

| Path | Purpose |
|------|---------|
| [app/serverActions/auth.ts](app/serverActions/auth.ts) | Auth server actions (register, login, Spotify, password reset) |
| [app/serverActions/onboarding.ts](app/serverActions/onboarding.ts) | Onboarding step mutations |
| [app/hooks/usePreferences.ts](app/hooks/usePreferences.ts) | Phase 2: CRUD for genre preferences + Spotify sync |
| [app/hooks/useMatching.ts](app/hooks/useMatching.ts) | Phase 3: swipe, match detection, analytics |
| [lib/cloudinary.ts](lib/cloudinary.ts) | Image upload/delete/optimization (5MB max, JPEG/PNG/WebP/HEIC) |
| [lib/location.ts](lib/location.ts) | Geolocation + Nominatim reverse geocoding |
| [lib/spotify-public-api.ts](lib/spotify-public-api.ts) | Spotify top artists/tracks fetching |
| [lib/profileConstants.ts](lib/profileConstants.ts) | Profile section config, validation messages |
| [lib/profileHelpers.ts](lib/profileHelpers.ts) | Enum formatting, profile completion calculation |
| [app/hooks/](app/hooks/) | `useAutoSave`, `useDebounce`, `useLocation`, `useMatching`, `usePreferences` |
| [app/components/profile/](app/components/profile/) | Reusable profile UI: `ProfileSection`, `InfoItem`, `BadgeList`, `PhotoGallery`, `QuickStats` |
| [types/onboarding.d.ts](types/onboarding.d.ts) | Onboarding DTOs |
| [types/phase2.d.ts](types/phase2.d.ts) | Genre preference DTOs |
| [types/phase3.d.ts](types/phase3.d.ts) | Matching/swipe DTOs |
| [types/auth.ts](types/auth.ts) | Auth DTO types |
| [providers.tsx](providers.tsx) | NextAuth `SessionProvider` wrapper |

### Backend API Endpoints

**Base URL:** `http://localhost:8080/api/v1`

Onboarding (8 steps): see [ONBOARDING_DTOS.md](ONBOARDING_DTOS.md)

**Phase 2 — Genre Preferences** (`Authorization: Bearer {token}` required):
- `GET /preferences/genres?limit=20` — get user preferences
- `POST /preferences/genres` — add `{genreName, weight}`
- `DELETE /preferences/genres/{genreName}` — remove preference
- `POST /preferences/genres/sync?quick=false` — sync from Spotify
- `DELETE /preferences/genres/spotify` — clear Spotify-derived preferences

**Phase 3 — Matching** (`Authorization: Bearer {token}` required):
- `GET /matching/potential?limit=20&minScore=60&excludeSwiped=true` — swipe candidates
- `POST /matching/swipe` — like/pass `{userId, action, score}`
- `GET /matching/score/{userId}` — compatibility breakdown
- `GET /matching/matches?status=active` — mutual matches
- `GET /matching/analytics` — personal stats

### Forms

All forms use **React Hook Form + Zod**. Components come from [components/ui/](components/ui/) (shadcn-ui wrappers). Form field wiring uses the `form.tsx` context pattern from shadcn.

### Image Uploads

Cloudinary handles all photo storage. Use `uploadToCloudinary()` / `deleteFromCloudinary()` / `getOptimizedImageUrl()` from [lib/cloudinary.ts](lib/cloudinary.ts). The API route [app/api/cloudinary/](app/api/cloudinary/) handles server-side deletions.

### Environment Variables

See [.env.example](.env.example) for required variables:
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
- `BACKEND_API_URL`, `NEXT_PUBLIC_API_URL`
- Cloudinary credentials (`NEXT_PUBLIC_CLOUDINARY_*`)
