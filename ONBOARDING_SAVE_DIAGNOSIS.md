# Onboarding "data not fully saving" — Playwright diagnosis

**Date:** 2026-06-07
**Method:** Drove the full email/password onboarding flow end-to-end with Playwright on a
clean dev server (killed the stale orphan, deleted `.next`, restarted so server stdout could
be captured). Test account: `userId 923ac830-4960-426b-8bb1-d66139b1d507` ("Alex Rivera"),
**email NOT verified**.

## TL;DR — root cause (CONFIRMED, not inferred)

The app lets an **email-unverified** user pass through registration → all 8 onboarding
steps → `FINISHED`. But the Spring Boot backend gates every Phase-2/Phase-3 endpoint on
email verification, returning **`403 {"error":"Email verification required"}`**. The
onboarding write endpoints (`/api/v1/onboarding/*`) are exempt, so most data saves — but the
verification-gated endpoints fail. The most damaging case is **favorite genres**, the core
matching signal.

**Confirmed by querying the backend directly with the live session token:**
- `GET /onboarding/profile` → 200; `registrationStage: "FINISHED"`, `completionPercentage: 100`
  → FINISHED *is* persisted in the backend DB (not just the JWT). Stage-gate ruled out.
- `GET /preferences/genres` → **403 `{"error":"Email verification required"}`**
- `POST /preferences/genres {genreName:"rock"}` → **403 `{"error":"Email verification required"}`**
  → still 403 *even though the user is already FINISHED* ⇒ the gate is **email verification**, full stop.
- `musicPreferences.favoriteGenres` on the profile = `["rock","indie pop","house"]`
  → the genre *list* persisted (it rides on the exempt `/onboarding/music-preferences` PUT),
  but the weighted `/preferences/genres` records that the matcher scores were never created.

## What saved vs. what failed (observed in server stdout)

| Step | Endpoint | Result |
|------|----------|--------|
| I Basic profile | `PUT /onboarding/basic-info` | ✅ 200 |
| II Location | `PUT /onboarding/location` | ✅ 200 |
| III Photos | Cloudinary upload + `PUT /onboarding/photos` | ✅ 200 |
| IV Music prefs (the DTO) | `PUT /onboarding/music-preferences` | ✅ 200 |
| IV **Genre preferences** | `POST /preferences/genres` ×3 (rock, indie pop, house) | ❌ **403 each** |
| V Lifestyle | `PUT /onboarding/lifestyle` | ✅ 200 |
| VI Personality | `PUT /onboarding/personality` | ✅ 200 |
| VII Dating prefs | `PUT /onboarding/dating-preferences` | ✅ 200 |
| VIII Privacy | `PUT /onboarding/privacy-settings` | ✅ 200 |
| Finish | `update({registrationStage:'FINISHED'})` | ✅ persisted in backend DB (profile = FINISHED, 100%) |

### Server log proof (Music step)
```
API error [403] correlationId=65bb38b6-...  { status: 403, code: undefined, message: 'Unknown error' }
API error [403] correlationId=9dbe672d-...  { status: 403, code: undefined, message: 'Unknown error' }
API error [403] correlationId=02333895-...  { status: 403, code: undefined, message: 'Unknown error' }
{
  context: 'onboarding:genre-sync',
  error: 'Some genre preferences failed to save',
  failedGenres: [ 'rock', 'indie pop', 'house' ]
}
 POST /onboarding 200 in 309ms
```
User-facing toast: *"Couldn't save these genres: rock, indie pop, and house. They won't
count toward matching until saved."* (the Retry button re-issues the same call → 403 again,
because the email is still unverified — the user can never satisfy it from this screen).

## The subtle "partial save"

`saveMusicPreferences` (app/serverActions/onboarding.ts) does TWO writes:
1. `PUT /onboarding/music-preferences` — stores `favoriteGenres` as a string[] on the music
   prefs object. **This succeeds.**
2. `POST /preferences/genres` per genre — creates the **weighted** `GenrePreference` records
   the matching engine actually scores against. **These 403.**

So the genre list *appears* saved (shows on the profile) while the matching-relevant records
are missing. That is the "not fully saving" symptom.

## Downstream consequence

`/discover` is unusable for this user: `GET /matching/potential` 403s → page renders
"Error / Unknown error / Try Again". Same root cause. This is also the source of the
original "permanent correlation id errors" complaint — they are these 403s being logged.

## Secondary bug — the error message is thrown away (CONFIRMED)

`lib/api.ts` already has machinery for this case (`EMAIL_VERIFICATION_REQUIRED`,
`isEmailVerificationError()`), but it's wired to the **wrong response field** and never fires:

```ts
// lib/api.ts:68 — reads err.message / err.code
const isEmailVerifBlock =
  response.status === 403 && (err?.message?.includes('Email verification') ?? false);
const baseMessage = err?.message || response.statusText || 'Unknown error';
```

The backend filter returns **`{"error":"Email verification required"}`** — field name
`error`, not `message`/`code`. So `err.message` is `undefined` ⇒ `isEmailVerifBlock` is
always `false`, `code` stays `undefined`, and `baseMessage` falls back to **`'Unknown
error'`**. That is exactly why every gated 403 surfaces as "Unknown error" + a correlationId
(the original complaint) instead of an actionable "verify your email" prompt. **Fix:** read
`err.error` as a fallback in `parseResponse` (and in `BackendErrorResponse`), e.g.
`err?.message ?? err?.error`, and match on it for `isEmailVerifBlock`.

### ✅ Frontend fix applied (2026-06-07)

`lib/api.ts` `parseResponse` now reads `err?.message ?? err?.error`, and
`BackendErrorResponse` (types/error.ts) gained an optional `error?: string`. Added two
regression tests in `__tests__/batch-d-email-verification.test.ts` pinning the real
`{ "error": "Email verification required" }` shape. Full suite: **404 passed**. Verified live —
`/discover` console now logs `code: EMAIL_VERIFICATION_REQUIRED, message: Email verification
required` instead of `code: undefined, message: Unknown error`.

This makes gated 403s **legible and routable** (`isEmailVerificationError()` now fires). It does
**not** fix the genre-persistence gap itself — that needs a backend or flow change (see below).

## Other issues found (not the save bug)
- **React hydration mismatch** on the onboarding forms: shadcn `useId()` ids differ between
  SSR and client (`_R_3bllet5relb_` vs `_R_den5et5relb_`). Cosmetic/a11y, present on clean build.
- **Uncontrolled→controlled input** warning on optional Lifestyle/Personality text fields
  (default `undefined` → typed value). Minor; set `defaultValues` to `''`.
- The onboarding sidebar **progress %** is a load-time prop and never updates as you advance
  (stuck at "12%"). Cosmetic.
- (Resolved/confirmed) The `matching/matches?limit=500` notification-poll 403 spam from the
  prior session was a **stale dev build**; on a clean build the `useNotifications` gate
  (`emailVerified && FINISHED`) correctly suppresses it.

## Fix options (decide product intent)

1. **Backend (cleanest for matching integrity):** allow authenticated users to write
   `/preferences/genres` regardless of email-verified state (treat it like the onboarding
   endpoints), OR have the onboarding music-preferences handler persist the weighted genre
   records server-side in the same exempt request instead of the client fanning out N
   verification-gated POSTs.
2. **Flow:** require email verification BEFORE onboarding (gate `/onboarding` on
   `emailVerified`), so every subsequent write succeeds. Largest UX change.
3. **Frontend stopgap:** detect the 403/verification state and (a) defer + auto-retry genre
   creation after verification, (b) replace the generic "Unknown error" on /discover with a
   "Verify your email to start matching" state. Does not fix the data gap on its own.
