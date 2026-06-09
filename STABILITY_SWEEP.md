# Frontend stability sweep — progress & findings

**Date:** 2026-06-07
**Context:** After the backend email-verification/genre-persistence fix. Plan: adapt to the
backend handoff, then Playwright-test for stability across all screens.

## Phase 1 — adapt to backend handoff ✅ DONE

| Change | File | Status |
|---|---|---|
| Remove redundant per-genre `POST /preferences/genres` fan-out (backend now persists genres in the music-prefs PUT) | `app/serverActions/onboarding.ts` (`saveMusicPreferences`, deleted `retryGenrePreferences`) | ✅ |
| Remove failed-genre toast + Retry UX (no partial-failure path anymore) | `app/onboarding/components/steps/MusicPreferencesStep.tsx` | ✅ |
| Delete obsolete test of the removed fan-out | `__tests__/batch12-onboarding-genre-failure-handling.test.ts` (deleted) | ✅ |
| Remove stale `onboarding:genre-sync` simulation | `__tests__/batch17-frontend-error-observability.test.ts` | ✅ |
| Add `/discover` "verify your email to start matching" state | `app/discover/page.tsx` | ✅ |
| (earlier) Read `err.error` fallback + verification detection | `lib/api.ts`, `types/error.ts` | ✅ |

**Test suite:** 26 files / 389 passed. Source typechecks clean.

## Phase 2 — live verification (Playwright)

✅ `/discover` for a FINISHED-but-unverified user now shows **"One more note. / Verify your
email to start matching."** instead of the old "Unknown error" / misleading empty state.

✅ The gated 403 now logs cleanly: `code: EMAIL_VERIFICATION_REQUIRED, message: Email
verification required` (was `code: undefined, message: Unknown error`).

⏳ **Blocked on email verification** (user to flip): re-test discover/matching/matches/
preferences against a functional account; plus a fresh-account onboarding pass to confirm the
Music step does no genre fan-out and persists genres via the single PUT.

## Findings

### F1 — `/profile` genre display inconsistency (pre-verification) — ✅ FIXED
On `/profile` for a FINISHED-but-unverified user:
- QuickStats shows **"3 Genres"** (from the exempt `GET /onboarding/profile` →
  `musicPreferences.favoriteGenres`).
- The "Music Taste" section shows **"No music preferences yet"** because
  `MusicPreferencesDisplay` calls `usePreferences()` → gated `GET /preferences/genres` → 403 →
  empty.

Cause: two different data sources for the same data. Self-heals after email verification (the
gated endpoint then returns the genres with weights/source for the rich display).

**Fix applied:** `MusicPreferencesDisplay` now takes an optional `fallbackGenres` prop;
`app/profile/page.tsx` passes `profile.musicPreferences?.favoriteGenres`. When the gated fetch
yields nothing, the section shows the saved genres (title-cased) with a "verify your email to
unlock the full breakdown" caption (only when `emailVerificationRequired`). The rich
weighted/source view returns automatically once `/preferences/genres` is reachable. Verified
live: `/profile` Music Taste now shows **Rock · Indie Pop · House**, consistent with the
"3 Genres" stat. Suite still 26 files / 389 passing.

### Observations (not bugs)
- The persistent "Please verify your email address" banner with a "resend email" action shows
  app-wide for unverified users — good.
- Onboarding sidebar progress % is a static load-time prop (doesn't update live). Cosmetic
  (noted in ONBOARDING_SAVE_DIAGNOSIS.md).
- Onboarding form hydration mismatch (`useId`) + uncontrolled→controlled warnings on optional
  fields. Cosmetic/a11y (noted previously).

## Phase 2B — fresh-account onboarding re-verification ✅ PASSED

Registered a new account (`test+sweep01@example.com`, "Jordan Vale") and ran all 8 steps via
Playwright. Confirmed against the **new** code:
- Every step saved (`PUT /onboarding/* → 200`), advanced correctly, reached `FINISHED`
  (persisted: `GET /onboarding/profile` → `registrationStage: FINISHED`, 100%).
- **Music step: the genre fan-out is GONE.** Selected 3 genres
  (alternative rock, synth-pop, techno); they persisted via the single
  `PUT /onboarding/music-preferences` (`profile.musicPreferences.favoriteGenres` =
  `["alternative rock","synth-pop","techno"]`). **No** per-genre `POST /preferences/genres`,
  **no** `onboarding:genre-sync` log block, **no** "Couldn't save these genres" toast.

### F2 — `fetchRecommendedGenres` 403 noise on Music-step mount — ✅ FIXED
`MusicPreferencesStep` called `fetchRecommendedGenres()` → `GET /api/v1/user/genres` (email-
verification-gated) on mount when no prior music data exists. For an unverified (or non-Spotify)
user this 403'd; React's dev double-invoke made it twice. It was already gracefully handled
(manual picker fallback), but logged 2× `API error [403] EMAIL_VERIFICATION_REQUIRED` noise.

**Fix applied:** gate the mount call on `emailVerified` via `useSession` — the effect now only
runs `loadRecommendedGenres()` when the session's `emailVerified === true`. Recommendations are
Spotify-derived and require a verified email anyway, so an unverified user loses nothing. Typecheck
clean; suite 26 files / 389 passing.

## Phase 3 — broad screen sweep (verified account: test+sweep01@example.com)

Run after re-login with `emailVerified: true`. Also confirmed the backend persisted the
onboarding genres as weighted records: `GET /preferences/genres` → 3 rows (alternative-rock,
synth-pop, techno; source `manual_selection`, weight 1.0).

| Screen | Result |
|---|---|
| `/login` | ✅ renders + sign-in works |
| `/register` | ✅ renders + registration works (Phase 2B) |
| `/discover` | ✅ real candidate cards w/ compatibility scores; **Like** ✅, **Pass** ✅ advance with 0 errors |
| `/discover` **Undo** | ⚠️ see F3 — backend 500, frontend degrades gracefully |

### F3 — Undo swipe → backend 500 — MEDIUM (backend item)
`DELETE /api/v1/matching/swipe/{userId}` returns **500 INTERNAL_ERROR**
(`{code: INTERNAL_ERROR, message: An unexpected error occurred}`). The frontend handles it
**correctly** — `undoSwipe` (useMatching.ts:545) rolls back the optimistic index (card stays
put) and shows "Could not undo swipe". Code comment at L552 already flags it: *"DELETE
/api/v1/matching/swipe/{userId} is NOT in the swagger spec. This endpoint must be agreed with
the backend team before shipping."* → **Backend**: implement/repair this endpoint, or return a
clean 404/501 so the frontend shows "Undo is not available yet" instead of a generic failure.
No frontend change needed (graceful already), beyond possibly hiding the Undo button until the
endpoint exists.

### F4 — protected client pages unreachable on hard navigation — ✅ FIXED (HIGH)
**Systemic bug.** Client pages redirected with `useEffect(() => { if (!session) router.push('/login') })`
where `session = useSession().data`. During the initial `'loading'` phase `data` is transiently
`undefined`, so the effect fired and pushed to `/login`; middleware then bounced the
(authenticated) user to `/discover`. Net: **any such page was unreachable via direct URL,
refresh, or bookmark** — it silently redirected to `/discover`. `/discover` itself was affected
but *masked* (it bounced to itself). In-app SPA link clicks worked (session already cached),
which is why it hid in normal use.

Affected & fixed (gate on `status === 'unauthenticated'`, template from the already-correct
`profile/[id]/page.tsx`): `app/matches/page.tsx`, `app/discover/page.tsx`,
`app/analytics/page.tsx`, `app/preferences/edit/page.tsx`. `app/profile/settings/page.tsx`
was already safe (has `if (status === 'loading') return null` before its redirect).

**Verified via hard `browser_navigate`:** `/matches`, `/analytics`, `/preferences/edit` now
hold their URL (previously all → `/discover`). Typecheck clean; suite 26 files / 389 passing.

### Full screen results (verified account, hard-navigation)

| Screen | Console | Result |
|---|---|---|
| `/login` | 0 err | ✅ renders + sign-in works |
| `/register` | 0 err | ✅ renders + registration works |
| `/forgot-password` | 0 err | ✅ email form renders |
| `/discover` | 0 err | ✅ candidate cards w/ scores; Like ✅, Pass ✅; Undo → F3 (backend 500, graceful) |
| `/matches` | 0 err | ✅ renders (after F4 fix); "No Mutual Matches Yet / liked 1 person" |
| `/profile` | 0 err | ✅ renders; Music Taste shows genres (after F1 fix) |
| `/edit-profile` | 0 err | ✅ renders; data prefilled (Jordan Vale, 33, Female, Bisexual), per-section edit |
| `/preferences/edit` | 0 err | ✅ shows 3 genres w/ weight/confidence; Add/Sync/Clear |
| `/profile/settings` | 0 err | ✅ Account/Security/Connected/Privacy/Danger Zone |
| `/analytics` | 0 err | ✅ stats accurate (2 swipes, 1 like 1 pass, 50% like rate, 0 matches) |
| `/profile/top-tracks` | 0 err | ✅ graceful "Unable to load" (non-Spotify account) |
| `/privacy` | 0 err | ✅ renders |
| `/terms` | 0 err | ✅ renders |

## Summary

**Frontend fixes shipped this session (all verified live, suite 26 files / 389 passing):**
- Email-verification error detection (`lib/api.ts` reads `err.error`) — gated 403s now legible.
- Removed redundant onboarding genre fan-out (backend persists server-side now).
- F1 — `/profile` genre display fallback from profile DTO.
- F2 — gate Music-step `fetchRecommendedGenres` on `emailVerified`.
- F4 — **systemic**: protected client pages were unreachable on hard navigation; gated the
  auth redirect on `status === 'unauthenticated'` (matches/discover/analytics/preferences·edit).

**Open item for the BACKEND team:**
- F3 — `DELETE /api/v1/matching/swipe/{userId}` (undo) returns 500; endpoint is not in the
  swagger spec. Frontend already degrades gracefully. Needs backend implementation or a clean
  404/501. (Frontend optional follow-up: hide the Undo button until the endpoint exists.)

**No remaining frontend errors** observed across any swept screen.
