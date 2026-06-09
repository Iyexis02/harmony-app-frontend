# Frontend Stability Roadmap

Generated from: Full-system adversarial audit (2026-03-22)
Status: Planning — no code changes yet

---

## Dependency Graph

```
Batch 1  (JWT generation)        ─── no deps
Batch 2  (Cloudinary IDOR)       ─── no deps
Batch 3  (Places auth)           ─── no deps
Batch 4  (Swipe concurrency)     ─── no deps
Batch 5  (Undo swipe)            ─── depends on Batch 4
Batch 6  (registrationStage)     ─── no deps
Batch 7  (JWT expiry detection)  ─── no deps
Batch 8  (Spotify refresh race)  ─── no deps
Batch 9  (Account deletion)      ─── no deps
Batch 10 (localStorage userId)   ─── no deps
Batch 11 (Cloudinary cleanup)    ─── depends on Batch 9
Batch 12 (Onboarding prefs)      ─── no deps
Batch 13 (Notification polling)  ─── no deps
Batch 14 (Email verif detection) ─── no deps
Batch 15 (session.error UI)      ─── depends on Batch 8
Batch 16 (Toast storm / UX)      ─── depends on Batch 13
Batch 17 (Frontend observability) ─── depends on Batch 5, Batch 13
```

## Implementation Order

1. Batch 1 — Move Spotify JWT generation to backend
2. Batch 2 — Cloudinary delete ownership check
3. Batch 3 — Places autocomplete authentication
4. Batch 4 — Swipe concurrency guard
5. Batch 5 — Undo swipe error handling
6. Batch 6 — Refresh registrationStage after onboarding
7. Batch 7 — Proactive JWT expiry detection for email users
8. Batch 8 — Spotify token refresh serialization
9. Batch 9 — Account deletion request cancellation
10. Batch 10 — Namespace localStorage keys by userId
11. Batch 11 — Cloudinary asset cleanup on account deletion
12. Batch 12 — Onboarding genre preference failure handling
13. Batch 13 — Notification polling through API wrapper
14. Batch 14 — Email verification detection specificity
15. Batch 15 — Surface session.error in UI
16. Batch 16 — Frontend circuit breaker / toast deduplication
17. Batch 17 — Frontend error observability

---

## Phase 1 — Critical Security Fixes (P0)

### - [x] Batch 1 — Move Spotify JWT Generation to Backend

Priority: P0 | Risk: High | Effort: 2–4 hours
Depends on: Nothing

#### Problem

Spotify OAuth users get their `appJwt` generated **client-side** in the Next.js server via `generateToken()` in `lib/jwt.ts`. This means the Next.js environment holds a `JWT_SECRET` capable of forging bearer tokens for any user. The backend has no way to distinguish a frontend-generated JWT from a forged one. There is no `jti`, `tokenVersion`, or revocation claim — a forged token is valid for 7 days.

Email/password login correctly receives a backend-issued JWT (`result.data.token`), but Spotify login bypasses this entirely.

If `JWT_SECRET` leaks from the Next.js environment, an attacker can mint tokens for arbitrary users.

#### Files Affected

- `lib/jwt.ts` (entire file — becomes unnecessary)
- `app/api/auth/[...nextauth]/route.ts` (lines 170–186, `storeTokens` function, JWT callback)

#### Implementation Tasks

1. Modify the `storeTokens()` function to expect the backend's `POST /api/v1/auth/spotify-login` response to include a `token` field (same shape as the email login response's `AuthResponseDto.token`).
2. In the JWT callback's Spotify branch (line 181), replace `token.appJwt = generateToken(spotifyUser.id, profile.email)` with `token.appJwt = spotifyUser.token` (the backend-issued JWT from the response).
3. Remove the `import { generateToken } from '@/lib/jwt'` from the NextAuth route file.
4. Verify that `lib/jwt.ts` is not imported anywhere else. If it is only used in the NextAuth route, delete the file entirely. If `verifyToken` is used elsewhere, keep only that function and remove `generateToken`.
5. Remove `JWT_SECRET` from `.env.example` if it is no longer needed by any frontend code.

#### Verification

- Log in with Spotify OAuth. Confirm the session contains a valid `accessToken` that the backend accepts (make any authenticated API call — e.g., fetch profile).
- Confirm `lib/jwt.ts` no longer exports `generateToken` (or is deleted).
- Confirm no `JWT_SECRET` reference remains in frontend environment variables (unless `verifyToken` is still needed).
- Confirm email/password login still works unchanged.

---

### - [ ] Batch 2 — Cloudinary Delete Ownership Check

Priority: P0 | Risk: High | Effort: 1–2 hours
Depends on: Nothing

#### Problem

The `POST /api/cloudinary/delete` route accepts any `publicId` from any authenticated user and deletes it from Cloudinary. There is no check that the requesting user owns that asset. Any authenticated user can delete any other user's photos by supplying their `publicId`.

Cloudinary public IDs follow a predictable pattern (`dating-app/profiles/{hash}`) and may be observable from profile API responses.

#### Files Affected

- `app/api/cloudinary/delete/route.ts`

#### Implementation Tasks

1. After extracting `publicId` from the request body, call the backend to verify ownership. Use `authenticatedApiRequest` to call the backend's profile/photos endpoint for the current user and confirm the `publicId` appears in their photo list.
2. Alternative (simpler, if backend doesn't have a photo-lookup endpoint): Enforce that the `publicId` starts with a user-scoped prefix. Change the upload logic in `lib/cloudinary.ts` to use folder `dating-app/profiles/{userId}` and validate in the delete route that `publicId.startsWith(`dating-app/profiles/${session.user.id}`)`.
3. If the ownership check fails, return `{ error: 'Forbidden' }` with status 403.
4. Add the user's ID to the `console.error` log on delete failure for audit trail.

#### Verification

- Upload a photo as User A. Attempt to delete it via the API as User B (different session). Confirm 403 response and photo remains.
- Upload and delete a photo as the same user. Confirm success.
- Confirm the delete route still works from the photo management modal in edit-profile.

---

### - [x] Batch 3 — Places Autocomplete Authentication

Priority: P0 | Risk: High | Effort: 0.5–1 hour
Depends on: Nothing

#### Problem

`GET /api/places/autocomplete` has no authentication check. Any unauthenticated client can proxy requests through the server's Google Maps API key, causing billing abuse.

#### Files Affected

- `app/api/places/autocomplete/route.ts`

#### Implementation Tasks

1. Add `getServerSession(authOptions)` check at the top of the `GET` handler, identical to the pattern in `app/api/cloudinary/delete/route.ts`.
2. If no session, return `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`.
3. Import `getServerSession` from `next-auth` and `authOptions` from the NextAuth route file.

#### Verification

- Without a session (e.g., in an incognito browser), call `/api/places/autocomplete?input=London`. Confirm 401 response.
- While logged in, use the location step in onboarding. Confirm autocomplete suggestions still load.

---

## Phase 2 — Concurrency & State Integrity (P1)

### - [ ] Batch 4 — Swipe Concurrency Guard

Priority: P1 | Risk: High | Effort: 1–2 hours
Depends on: Nothing

#### Problem

The `isSwipingRef` in `app/discover/page.tsx` exists and is checked in the keyboard handler (line 107), but is **never set to `true` or `false`** anywhere. Button clicks bypass it entirely. Rapid clicks fire multiple `swipe()` calls before the first resolves, causing:

- Multiple simultaneous requests for different cards
- Stale `prevIndex` captures if one fails and rolls back
- Cards skipped or double-swiped

#### Files Affected

- `app/discover/page.tsx` (lines 46, 107, 116–120)

#### Implementation Tasks

1. In `handleSwipe` (line 116), add `isSwipingRef.current = true` as the first line after the guard checks.
2. Modify the `swipe()` call to be awaited: `await swipe(...)`.
3. After the `await` resolves (success or failure), set `isSwipingRef.current = false`.
4. Add `isSwipingRef.current` to the guard check at the top of `handleSwipe`: `if (!currentMatch || rateLimited || isSwipingRef.current) return;`
5. Wrap the whole thing in a try/finally to guarantee the ref is reset even on unexpected errors:
   ```
   try {
     isSwipingRef.current = true;
     await swipe(...);
   } finally {
     isSwipingRef.current = false;
   }
   ```
6. Disable the Like/Pass/Super Like/Block buttons when `isSwipingRef.current` is true. Since refs don't trigger re-renders, add a `const [isSwiping, setIsSwiping] = useState(false)` that mirrors the ref, and use it for button `disabled` prop. Set both the ref and state together.

#### Verification

- Rapidly click the Like button 5 times in quick succession. Confirm only one swipe is submitted (check network tab).
- Confirm keyboard shortcuts also respect the guard (hold ArrowRight).
- Confirm buttons show disabled state during the swipe request.
- Confirm normal single-click swiping still works without delay.

---

### - [ ] Batch 5 — Undo Swipe Error Handling

Priority: P1 | Risk: High | Effort: 1–2 hours
Depends on: Batch 4

#### Problem

`undoSwipe` in `useMatching.ts` (lines 515–523) fires a `void` (fire-and-forget) DELETE request. The comment explicitly says "endpoint may not exist yet." If the backend returns 404/500/network error:

- The UI shows the card again (optimistic rollback happened)
- The swipe remains recorded server-side
- Swiping the same card again triggers `DUPLICATE_SWIPE`
- If the original swipe created a match, the match persists server-side but the user thinks they undid it

#### Files Affected

- `app/hooks/useMatching.ts` (lines 515–523)
- `app/discover/page.tsx` (lines 125–129)

#### Implementation Tasks

1. Change `undoSwipe` from fire-and-forget to awaited with error handling:
   - Remove the `void` keyword before `authenticatedApiRequest`.
   - `await` the request and check `result.ok`.
2. If the response is `!result.ok`:
   - If `result.error.status === 404` (endpoint doesn't exist): roll forward (re-increment `currentMatchIndex` to where it was), clear `lastSwipedUserId`, and show `toast.error('Undo is not available yet')`.
   - If `result.error.status === 429`: show rate limit toast.
   - For other errors: roll forward and show `toast.error('Could not undo swipe')`.
3. If the request throws (network error): same roll-forward behavior with a generic error toast.
4. In `discover/page.tsx`, the `handleUndo` function should also respect the `isSwipingRef` guard from Batch 4 to prevent undo during an in-flight swipe.
5. Store the `prevIndex` before decrementing in `undoSwipe` so the roll-forward knows which index to restore.

#### Verification

- With the backend undo endpoint not implemented (returns 404): click Undo, confirm toast says "Undo is not available yet", confirm the card does NOT reappear (index rolls forward).
- With the backend undo endpoint working: click Undo, confirm card reappears and re-swiping works.
- With backend down (network error): click Undo, confirm toast says "Could not undo swipe", confirm card does NOT reappear.
- Confirm that undo cannot be triggered while a swipe is in-flight.

---

## Phase 3 — Authentication & Session Stability (P2)

### - [ ] Batch 6 — Refresh registrationStage After Onboarding

Priority: P2 | Risk: Medium | Effort: 1–2 hours
Depends on: Nothing

#### Problem

`registrationStage` is set in the NextAuth JWT only at initial sign-in (line 157 for email, line 183 for Spotify). It is never updated after onboarding completes. The middleware (line 27) uses it to route users:

```
const destination = token.registrationStage === 'FINISHED' ? '/discover' : '/onboarding';
```

After completing onboarding, the user's JWT still contains the old stage. The middleware redirects to `/onboarding`, the onboarding page fetches progress from the backend, sees `FINISHED`, and redirects to `/profile`. This creates a visible redirect bounce on every page load.

#### Files Affected

- `app/onboarding/components/OnboardingContainer.tsx` (the completion handler)
- `app/api/auth/[...nextauth]/route.ts` (JWT callback, lines 192–200)

#### Implementation Tasks

1. In the `OnboardingContainer` completion handler (where `showCelebration` is set and redirect to `/discover` happens), add a call to NextAuth's `update()` function from `useSession()` to trigger a session refresh.
2. In the NextAuth JWT callback, add logic for the "returning token" path (lines 192–200, the section after initial sign-in): if `token.registrationStage` is not `FINISHED`, make a lightweight API call to check the current registration stage from the backend and update `token.registrationStage`. To avoid doing this on every request, only check when `token.registrationStage !== 'FINISHED'` (once it's FINISHED, it stays FINISHED).
3. Alternative simpler approach: In the JWT callback, when `trigger === 'update'` (NextAuth session update trigger), accept a `registrationStage` parameter and update the token. Then call `update({ registrationStage: 'FINISHED' })` from the onboarding completion handler. This avoids the API call.

#### Verification

- Complete onboarding for a fresh user. After the celebration screen, confirm navigation goes directly to `/discover` without a redirect bounce.
- Refresh the page after onboarding completion. Confirm the middleware does NOT redirect to `/onboarding`.
- Confirm existing users with `FINISHED` stage are unaffected.

---

### - [ ] Batch 7 — Proactive JWT Expiry Detection for Email Users

Priority: P2 | Risk: Medium | Effort: 2–3 hours
Depends on: Nothing

#### Problem

Email/password users get a 7-day JWT with no refresh mechanism. When it expires, the next API call returns 401 and the user is abruptly signed out. There is no proactive warning or renewal.

#### Files Affected

- `providers.tsx` (or a new layout-level component)
- `app/api/auth/[...nextauth]/route.ts` (JWT callback)

#### Implementation Tasks

1. In the NextAuth JWT callback, for email/password users (the `token.authProvider === 'EMAIL'` branch at line 193), decode the `appJwt` to read its `exp` claim and store it on the token object as `token.appJwtExpires = decodedPayload.exp * 1000` (milliseconds).
2. In the session callback (line 205), expose this as `session.appJwtExpires = token.appJwtExpires`.
3. Extend the session type in `next-auth.d.ts` to include `appJwtExpires?: number`.
4. Create a `useSessionHealth` hook (or add logic to an existing layout component) that:
   - Reads `session.appJwtExpires`
   - If the JWT expires within the next 30 minutes, shows a persistent toast/banner: "Your session expires soon. Please sign in again to continue."
   - If the JWT has expired, calls `signOut()` with a message.
   - Check on a 60-second interval and on tab visibility change.
5. Integrate this hook in the main layout or `providers.tsx` so it runs globally.

#### Verification

- Login with email/password. Manually set a short JWT expiry (e.g., 2 minutes) in the backend for testing. Confirm a warning appears ~1 minute before expiry.
- Confirm that after expiry, the user is signed out gracefully with a message, not abruptly mid-action.
- Confirm Spotify users are not affected by this logic.

---

### - [ ] Batch 8 — Spotify Token Refresh Serialization

Priority: P2 | Risk: Medium | Effort: 2–3 hours
Depends on: Nothing

#### Problem

When a Spotify user's token expires, every concurrent request hitting the NextAuth JWT callback independently attempts to refresh the token via Spotify's `/api/token`. Spotify refresh tokens are single-use (rotating) — the first refresh succeeds and invalidates the old refresh token. Subsequent concurrent refreshes fail because they use the now-invalidated token, setting `error: 'RefreshAccessTokenError'` on the session.

#### Files Affected

- `app/api/auth/[...nextauth]/route.ts` (lines 58–93, 197–203)

#### Implementation Tasks

1. Add a module-level in-memory lock to serialize refresh attempts. Use a simple promise-based approach:
   - Declare `let refreshPromise: Promise<any> | null = null` at module scope.
   - In the JWT callback, before calling `refreshAccessToken()`, check if `refreshPromise` exists.
   - If it does, `await refreshPromise` and return the result (the first caller's refreshed token).
   - If it doesn't, set `refreshPromise = refreshAccessToken(token)`, await it, store the result, then set `refreshPromise = null`.
2. This ensures only one refresh call hits Spotify at a time. Concurrent callers wait for the first one to complete.
3. Add a timeout to the lock (e.g., 10 seconds) so a hung refresh doesn't permanently block all sessions. After timeout, clear the lock and let the next caller retry.

#### Verification

- With a Spotify user whose token just expired, open multiple tabs simultaneously. Confirm only one refresh request goes to Spotify (check server logs or network).
- Confirm all tabs receive the refreshed token and continue working.
- Simulate a failed refresh (e.g., revoke the refresh token at Spotify). Confirm `RefreshAccessTokenError` is set cleanly and the lock is released.

---

## Phase 4 — Data Integrity & Consistency (P2)

### - [ ] Batch 9 — Account Deletion Request Cancellation

Priority: P2 | Risk: Medium | Effort: 1–2 hours
Depends on: Nothing

#### Problem

When a user deletes their account (`DELETE /api/v1/users/me`), in-flight requests from other components (notification polling, background match fetches, auto-save) continue firing with the now-invalid token. These produce 401 errors that trigger `signOut()` calls racing with the settings page's own `signOut()`. React state updates from in-flight requests can fire after component unmount.

#### Files Affected

- `app/profile/settings/page.tsx` (lines 158–200)

#### Implementation Tasks

1. Add an `AbortController` in the delete handler. Before calling `DELETE /api/v1/users/me`:
   - Set a module-level or context-level flag `isDeletingAccount = true` (or use a ref).
   - Call `signOut({ redirect: false })` **before** the delete call to immediately invalidate the local session and stop all hooks from making further requests (since `token` becomes undefined, all hooks short-circuit).
2. Then make the delete call.
3. After the delete call succeeds, redirect to `/` manually via `router.push('/')`.
4. If the delete call fails, re-authenticate the user (they were already signed out in step 1). Show an error toast explaining they need to log in again and retry.
5. Alternatively (less disruptive): Don't pre-sign-out. Instead, after the delete call succeeds but before calling `signOut()`, set a flag in localStorage (e.g., `accountDeleted: true`). Have the notification polling and other hooks check this flag and skip requests if set. Then `signOut()` clears everything.

#### Verification

- Delete an account while the matches page is open in another tab. Confirm no cascading error toasts in the other tab.
- Delete an account while notification polling is active. Confirm no error in console after deletion.
- Simulate a failed delete (wrong password for email user). Confirm the session is still valid and the user can retry.

---

### - [ ] Batch 10 — Namespace localStorage Keys by userId

Priority: P2 | Risk: Medium | Effort: 0.5–1 hour
Depends on: Nothing

#### Problem

`useNotifications` stores `hasNewMatch` and `matchesSeenCount` in localStorage without any user scoping. If User A logs out and User B logs in on the same browser, User B inherits User A's badge state. Similarly, `spotifyLinked` in the settings page is not scoped.

#### Files Affected

- `app/hooks/useNotifications.tsx` (lines 26, 35, 41–42, 72, 75)
- `app/profile/settings/page.tsx` (lines 53–56, 92)

#### Implementation Tasks

1. In `useNotifications`, get `userId` from the session: `const userId = (session as any)?.user?.id`.
2. Replace all bare localStorage keys with user-scoped keys:
   - `'hasNewMatch'` → `` `hasNewMatch:${userId}` ``
   - `'matchesSeenCount'` → `` `matchesSeenCount:${userId}` ``
3. Guard all localStorage reads/writes behind `if (userId)` checks to prevent writing keys like `hasNewMatch:undefined`.
4. In the `StorageEvent` handler, update the key check to match the scoped key.
5. In `app/profile/settings/page.tsx`, scope `spotifyLinked` → `` `spotifyLinked:${session.user.id}` ``.
6. On sign-out (if there's a hook or handler), no cleanup needed — scoped keys are harmless to leave.

#### Verification

- Log in as User A, trigger a match notification (badge appears). Log out. Log in as User B. Confirm badge is NOT showing.
- Log in as User A again. Confirm badge IS still showing (their scoped key persists).
- Open two tabs as the same user. Signal a match in one tab. Confirm the StorageEvent syncs the badge to the other tab.

---

### - [ ] Batch 11 — Cloudinary Asset Cleanup on Account Deletion

Priority: P2 | Risk: Medium | Effort: 1–2 hours
Depends on: Batch 9

#### Problem

When a user deletes their account, the backend presumably cleans up database records, but there is no evidence that Cloudinary assets (photos) are deleted. Photos persist indefinitely in Cloudinary after account deletion.

#### Files Affected

- `app/profile/settings/page.tsx` (delete handler)
- `lib/cloudinary.ts` (`deleteFromCloudinary`)

#### Implementation Tasks

1. Before calling `DELETE /api/v1/users/me`, fetch the user's current profile via `getCompleteProfile()` to get their photo URLs.
2. Extract Cloudinary public IDs from each photo URL.
3. After the backend delete succeeds (but before `signOut`), call `deleteFromCloudinary(publicId)` for each photo using `Promise.allSettled()` (best-effort — don't block sign-out on Cloudinary failures).
4. If the backend's delete endpoint already handles Cloudinary cleanup server-side, this batch is unnecessary. Verify with the backend team first. If the backend handles it, mark this batch as "Skipped — backend handles cleanup" and move on.

#### Verification

- Upload 3 photos as a test user. Delete the account. Check Cloudinary dashboard — confirm photos are removed (or confirm backend handles it).
- If Cloudinary delete fails for one photo, confirm account deletion still completes (sign-out happens).

---

### - [ ] Batch 12 — Onboarding Genre Preference Failure Handling

Priority: P2 | Risk: Medium | Effort: 1–1.5 hours
Depends on: Nothing

#### Problem

`saveMusicPreferences` in `app/serverActions/onboarding.ts` (lines 46–63) saves the onboarding step first, then fires parallel POST requests for each genre using `Promise.allSettled()`. If the onboarding save succeeds but some genre POSTs fail, the user's step advances but their genre preferences are incomplete. There is no logging, no retry, and no user notification.

#### Files Affected

- `app/serverActions/onboarding.ts` (lines 46–63)

#### Implementation Tasks

1. Capture the results of `Promise.allSettled()`.
2. Filter for `status === 'rejected'` or results where `result.value.ok === false`.
3. If any genre syncs failed:
   - Log the failures with the genre names and error details using `console.error` with context (userId from session, genre names).
   - Return a modified success response that includes a `warnings` field: `{ ok: true, data: undefined, warnings: ['Some genre preferences could not be saved. You can add them later in Preferences.'] }`.
4. Update the `ApiResult` type or the onboarding step component to check for and display warnings via toast if present.
5. Keep the current behavior of not blocking onboarding progression — the step should still advance even if some genres fail.

#### Verification

- During onboarding music step, submit with 5 genres. Simulate one genre POST failing (e.g., backend rejects a genre name). Confirm:
  - The onboarding step advances.
  - A warning toast appears mentioning partial failure.
  - The other 4 genres are saved.
- Confirm that when all genres succeed, no warning appears.

---

## Phase 5 — Observability & Error Handling (P3)

### - [ ] Batch 13 — Notification Polling Through API Wrapper

Priority: P3 | Risk: Medium | Effort: 1–1.5 hours
Depends on: Nothing

#### Problem

`useNotifications.tsx` (line 66) uses raw `fetch()` instead of `authenticatedApiRequest()`. This bypasses:
- `X-Correlation-Id` header (invisible in backend logs)
- Structured error parsing (`ApiResult`)
- Proper 401 detection (expired JWT is silently ignored instead of triggering sign-out)
- Content-Type header

Additionally, the base URL `API_BASE_URL` is hardcoded as `http://localhost:8080/api/v1` and the path is `/matching/matches`, resulting in `http://localhost:8080/api/v1/matching/matches`. But `authenticatedApiRequest` uses `getBaseUrl()` which returns `http://localhost:8080` (no `/api/v1` suffix). The URL construction is inconsistent and may hit the wrong path.

#### Files Affected

- `app/hooks/useNotifications.tsx` (lines 6, 62–81)

#### Implementation Tasks

1. Remove the `API_BASE_URL` constant at line 6.
2. Replace the raw `fetch` call with `authenticatedApiRequest`:
   ```
   const result = await authenticatedApiRequest<{ matches: any[]; hasMore: boolean }>(
     '/api/v1/matching/matches?status=active&limit=100',
     accessToken
   );
   ```
3. Handle the `ApiResult` response:
   - If `!result.ok`: return early (keep silent — badge is best-effort).
   - If `result.ok`: extract count from `result.data.matches?.length ?? 0`.
4. Keep the existing `fetchingRef` concurrency guard and `document.hidden` check.
5. Keep the "poll can only SET true, never clear" behavior.

#### Verification

- Log in and navigate. Check network tab — confirm the badge poll includes `X-Correlation-Id` header.
- Confirm badge still appears when a new match exists.
- Confirm that a 401 response from the poll does NOT trigger sign-out (badge is best-effort, not auth-critical).

---

### - [ ] Batch 14 — Email Verification Detection Specificity

Priority: P3 | Risk: Medium | Effort: 1–1.5 hours
Depends on: Nothing

#### Problem

In `lib/api.ts` (lines 68–70), the email verification detection treats **any** 403 with code `FORBIDDEN` as an email verification error:

```typescript
const isEmailVerifBlock =
  response.status === 403 &&
  ((err?.message?.includes('Email verification') ?? false) || err?.code === 'FORBIDDEN');
```

This means a 403 for accessing another user's resource, or an admin-only endpoint, is misidentified as "email not verified." The user sees "Please verify your email" instead of the actual error.

#### Files Affected

- `lib/api.ts` (lines 68–70)

#### Implementation Tasks

1. Remove the `err?.code === 'FORBIDDEN'` fallback from the `isEmailVerifBlock` condition. This overly broad check is the source of false positives.
2. Keep only the message-based check as a fallback: `err?.message?.includes('Email verification')`.
3. Better: negotiate with the backend team to return a dedicated error code (e.g., `EMAIL_NOT_VERIFIED` or `EMAIL_VERIFICATION_REQUIRED`) from the EmailVerificationFilter, rather than the generic `FORBIDDEN`. Then match on that specific code only:
   ```
   const isEmailVerifBlock =
     response.status === 403 &&
     (err?.code === 'EMAIL_VERIFICATION_REQUIRED' || err?.code === 'EMAIL_NOT_VERIFIED' ||
      (err?.message?.includes('Email verification') ?? false));
   ```
4. If the backend already returns a specific code and it was just not being matched, update the check to match the actual code.

#### Verification

- As an unverified user, make an API call. Confirm "Please verify your email" appears.
- Simulate a 403 with code `FORBIDDEN` and a non-email message (e.g., "Access denied"). Confirm the actual error message is shown, NOT the email verification prompt.
- Confirm all existing email verification flows still work.

---

### - [ ] Batch 15 — Surface session.error in UI

Priority: P3 | Risk: Medium | Effort: 1–2 hours
Depends on: Batch 8

#### Problem

When Spotify token refresh fails, `session.error` is set to `'RefreshAccessTokenError'` (via `route.ts:90` → `route.ts:214-216`). However, **no component in the entire frontend reads `session.error`**. The user's Spotify connection is broken, but they see no indication until the next API call that requires Spotify access fails individually.

#### Files Affected

- `providers.tsx` (or a new layout-level component)
- `app/api/auth/[...nextauth]/route.ts` (lines 214–216, for reference)

#### Implementation Tasks

1. Create a `SessionErrorBanner` component (or add logic to an existing layout component).
2. Use `useSession()` to read `session.error`.
3. If `session.error === 'RefreshAccessTokenError'`:
   - Show a persistent, dismissible banner: "Your Spotify connection has expired. Reconnect to keep your music preferences in sync."
   - Include a "Reconnect" button that navigates to `/api/spotify/connect`.
   - Include a "Dismiss" button that hides the banner for the current session (use state, not localStorage — it should reappear on next session).
4. Place this component in the root layout or inside `providers.tsx`, above the main content.
5. Only show for users with `authProvider === 'SPOTIFY'` (email users don't have Spotify tokens to refresh).

#### Verification

- Force a Spotify token refresh failure (revoke the refresh token, or mock the response). Confirm the banner appears on the next page load.
- Click "Reconnect." Confirm it navigates to the Spotify OAuth flow.
- Click "Dismiss." Confirm the banner hides. Refresh the page. Confirm it reappears.
- Confirm the banner does NOT appear for email/password users.

---

### - [ ] Batch 16 — Frontend Circuit Breaker / Toast Deduplication

Priority: P3 | Risk: Low | Effort: 2–3 hours
Depends on: Batch 13

#### Problem

If the backend is down, every user action (swipe, fetch matches, fetch score, etc.) produces an individual error toast. With rapid interactions or multiple components polling, this creates a "toast storm" — dozens of stacked error toasts flooding the screen. There is no deduplication or circuit-breaking.

#### Files Affected

- `lib/api.ts` (or a new `lib/apiHealth.ts` utility)
- All hooks that call `authenticatedApiRequest` (indirect)

#### Implementation Tasks

1. Create a simple client-side circuit breaker in `lib/api.ts` (or a new file imported by `api.ts`):
   - Track consecutive failure count (status 0 or 5xx).
   - After 3 consecutive failures within 30 seconds, enter "open" state.
   - In "open" state: immediately return `{ ok: false, error: { status: 0, message: 'Service temporarily unavailable' } }` without making the request. Show a single toast: "Connection lost. Retrying..."
   - After 10 seconds in "open" state, transition to "half-open" — allow one request through.
   - If it succeeds, close the circuit. If it fails, re-open.
2. For toast deduplication, use Sonner's built-in `toast.error(message, { id: 'network-error' })` to ensure only one network error toast is visible at a time. The `id` parameter deduplicates.
3. Reset failure count on any successful response.

#### Verification

- Stop the backend. Click Like 5 times rapidly. Confirm only one error toast appears (not 5).
- With backend still down, confirm the circuit opens and subsequent actions show "Service temporarily unavailable" without making network requests (check network tab).
- Start the backend again. Confirm the circuit closes and normal operation resumes within 10 seconds.

---

### - [ ] Batch 17 — Frontend Error Observability

Priority: P3 | Risk: Low | Effort: 1–2 hours
Depends on: Batch 5, Batch 13

#### Problem

Multiple error paths exist that are completely invisible in production:
1. Fire-and-forget undo swipe failures (Batch 5 fixes the user-facing part, but no logging exists)
2. `Promise.allSettled` genre sync failures in `saveMusicPreferences` (swallowed entirely)
3. All `console.error` calls in hooks are invisible without a client-side logging service
4. Cloudinary delete failures return `boolean` with no structured logging
5. Notification poll errors are silently caught

Without a production logging service, this batch adds structured `console.error` calls with consistent format so that if/when a logging service is added, all errors are already instrumented.

#### Files Affected

- `app/hooks/useMatching.ts` (catch blocks)
- `app/hooks/useNotifications.tsx` (catch block)
- `app/serverActions/onboarding.ts` (Promise.allSettled block)
- `lib/cloudinary.ts` (delete function)

#### Implementation Tasks

1. Define a lightweight error logging helper in `lib/logger.ts`:
   ```
   function logError(context: string, error: unknown, meta?: Record<string, unknown>)
   ```
   This wraps `console.error` with a consistent JSON-like format: `{ context, error, timestamp, ...meta }`.
2. Replace bare `console.error` calls in the affected files with `logError(context, err, { userId, action })` where context is a human-readable string like `'swipe:undo'`, `'notification:poll'`, `'onboarding:genre-sync'`, `'cloudinary:delete'`.
3. Do NOT add a third-party logging service — just standardize the format so a future integration is trivial.
4. Ensure all catch blocks that currently swallow errors (`catch {}` or `catch { // silent }`) at minimum call `logError`.

#### Verification

- Trigger each error path (failed undo, failed genre sync, failed Cloudinary delete, failed notification poll). Check browser console. Confirm each produces a structured log entry with context, error details, and timestamp.
- Confirm no user-visible behavior changes — this batch is observability-only.

---

## Summary

| Phase | Batches | Total Effort |
|-------|---------|-------------|
| Phase 1 — Critical Security | 1, 2, 3 | 3.5–7 hours |
| Phase 2 — Concurrency & State | 4, 5 | 2–4 hours |
| Phase 3 — Auth & Session | 6, 7, 8 | 5–8 hours |
| Phase 4 — Data Integrity | 9, 10, 11, 12 | 3.5–6.5 hours |
| Phase 5 — Observability | 13, 14, 15, 16, 17 | 6.5–10 hours |
| **Total** | **17 batches** | **20.5–35.5 hours** |
