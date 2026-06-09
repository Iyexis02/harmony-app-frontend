# Frontend ↔ Backend Sync: Implementation Roadmap

**Created**: 2026-03-22
**Purpose**: Step-by-step batch roadmap to sync the Next.js frontend with the Spring Boot backend API.
**Source**: Gap analysis comparing `BACKEND_PROJECT_STATUS.md` against the current frontend codebase.

> **For implementing agents**: Each batch below is independently implementable unless a dependency is listed. Mark the batch checkbox when complete. Read the full batch before starting — scope, tasks, and verification are all required.

---

## Dependency Graph

```
A ──► B ──┬──► C
          ├──► D
          ├──► E
          ├──► F  (P1)
          ├──► G  (P1)
          └──► M  (P2)

H, I, J, K, L, N — independent (no dependencies)
```

**Legend**: `X ──► Y` means Y depends on X being complete first.

---

## Batch Status Overview

| Batch | Title | Priority | Depends On | Status |
|-------|-------|----------|------------|--------|
| A | Error Response Type & Constants | P0 | — | [x] |
| B | Centralized Fetch Wrapper | P0 | A | [x] |
| C | Per-Field Validation Display | P0 | B | [x] |
| D | 403 Email Verification Interceptor | P0 | B | [x] |
| E | Auth Error Code Handling | P0 | B | [x] |
| H | Account Deletion Password Fix | P0 | — | [ ] |
| F | Matching Error Code Handling | P1 | B | [x] |
| G | Spotify Error Code Handling | P1 | B | [x] |
| I | Rate Limit UI for Swipes | P1 | — | [x] |
| J | Block User UI | P1 | — | [x] |
| K | Match List Pagination | P1 | — | [x] |
| L | Match Card Metadata | P2 | — | [ ] |
| M | X-Correlation-Id Support | P2 | B | [x] |
| N | Cleanup: Deprecated Fields & Limits | P2 | — | [x] |

---

## Phase 1 — Critical UX & Correctness (P0)

---

### - [x] Batch A — Error Response Type & Error Code Constants

**Priority**: P0
**Depends on**: Nothing
**Files to create/modify**: `types/error.ts`, `types/auth.ts`, `app/serverActions/onboarding.ts`, `serverActions.ts`

#### Context

The backend returns a standardized error shape on **every** error:

```typescript
{ code: string; message: string; fields?: Record<string, string> | null; timestamp: string }
```

The frontend has no type for this. It also has no constants for the 14 backend error codes. The `ApiError` type in `types/auth.ts` only carries `{ status: number; message: string }`.

#### Scope

- No `BackendErrorResponse` type matching backend contract
- No error code constants for: `VALIDATION_ERROR`, `INVALID_ARGUMENT`, `INVALID_TOKEN`, `UNAUTHORIZED`, `FORBIDDEN`, `ACCOUNT_LOCKED`, `NOT_FOUND`, `EMAIL_EXISTS`, `CONFLICT`, `DUPLICATE_SWIPE`, `CONCURRENT_MODIFICATION`, `SPOTIFY_TOKEN_EXPIRED`, `SPOTIFY_UNAVAILABLE`, `INTERNAL_ERROR`
- `ApiError` type doesn't carry `code` or `fields`
- `ApiResult` type is duplicated in `types/auth.ts`, `serverActions/onboarding.ts`, and `serverActions.ts`

#### Implementation Tasks

1. Create `types/error.ts`:

```typescript
/**
 * Matches the backend's standardized error response shape.
 * Every non-2xx response from the Spring Boot API returns this structure.
 */
export interface BackendErrorResponse {
  code: string;
  message: string;
  fields?: Record<string, string> | null;
  timestamp: string;
}

/**
 * All error codes the backend can return.
 * Use these for switch/case control flow — NEVER switch on message strings.
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  INVALID_TOKEN: 'INVALID_TOKEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  NOT_FOUND: 'NOT_FOUND',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  CONFLICT: 'CONFLICT',
  DUPLICATE_SWIPE: 'DUPLICATE_SWIPE',
  CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION',
  SPOTIFY_TOKEN_EXPIRED: 'SPOTIFY_TOKEN_EXPIRED',
  SPOTIFY_UNAVAILABLE: 'SPOTIFY_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
```

2. Extend `ApiError` in `types/auth.ts`:

```typescript
export interface ApiError {
  ok: false;
  error: {
    status: number;
    message: string;
    code?: string;
    fields?: Record<string, string> | null;
  };
}
```

3. Remove duplicate `ApiResult` type definitions from `app/serverActions/onboarding.ts` and `serverActions.ts`. Both files should import from `types/auth.ts`.

4. Ensure all existing code that reads `error.message` still compiles (the field is unchanged — `code` and `fields` are additive optional properties).

#### Verification

- `npm run build` passes with zero type errors
- All existing server actions and hooks compile without changes to their logic
- `BackendErrorResponse` type is importable from `types/error.ts`
- `ErrorCode.VALIDATION_ERROR` (and all 13 others) are importable constants
- `ApiError` now accepts `code` and `fields` without breaking existing `error.message` reads
- No duplicate `ApiResult` definitions remain outside `types/auth.ts`

---

### - [x] Batch B — Centralized Fetch Wrapper

**Priority**: P0
**Depends on**: Batch A
**Files to create/modify**: `lib/api.ts`, `app/serverActions/auth.ts`, `app/serverActions/onboarding.ts`, `serverActions.ts`, `app/hooks/useMatching.ts`, `app/hooks/usePreferences.ts`

#### Context

Error parsing is duplicated across 5+ files. Each uses a different pattern (`data?.message || data?.error || statusText`). None parse the backend's `code` or `fields`. This batch creates a single fetch wrapper that all API calls route through.

#### Scope

- No centralized fetch wrapper
- Error parsing duplicated in: `auth.ts`, `onboarding.ts`, `useMatching.ts`, `usePreferences.ts`, `serverActions.ts`
- None of the parsers extract `code` or `fields` from backend error responses

#### Implementation Tasks

1. Create `lib/api.ts` with two exported functions:

   **`apiRequest<T>(url: string, options?: RequestInit): Promise<ApiResult<T>>`**
   - For public endpoints (no auth header)
   - Calls `fetch()`, delegates to shared parser

   **`authenticatedApiRequest<T>(url: string, options?: RequestInit): Promise<ApiResult<T>>`**
   - Gets session via `getServerSession()` (server actions) or accepts token param (client hooks)
   - Attaches `Authorization: Bearer ${token}`
   - Delegates to shared parser

   **Shared parser logic (internal function)**:
   ```
   if response.ok → return { ok: true, data: await response.json() }
   if status 429  → parse Retry-After header, return ApiError with message
   otherwise      → parse body as BackendErrorResponse
                    return { ok: false, error: { status, message: body.message, code: body.code, fields: body.fields } }
   on catch       → return { ok: false, error: { status: 0, message: 'Network error' } }
   ```

2. Migrate `makeAuthRequest()` and `makeAuthenticatedRequest()` in `app/serverActions/auth.ts` to use the new wrapper. Remove the old functions.

3. Migrate all fetch calls in `app/serverActions/onboarding.ts` to use `authenticatedApiRequest()`.

4. Migrate fetch calls in `app/hooks/useMatching.ts` — these are client-side, so the wrapper variant here should accept a token string directly rather than calling `getServerSession()`.

5. Migrate fetch calls in `app/hooks/usePreferences.ts` — same client-side pattern.

6. Migrate fetch calls in `serverActions.ts` to use the appropriate wrapper.

**Important**: The wrapper must handle the case where `response.json()` fails (e.g. 204 No Content from account deletion). If body is empty, return `{ ok: true, data: null as T }` for success, or `{ ok: false, error: { status, message: statusText } }` for errors.

#### Verification

- `npm run build` passes
- Register flow: submit invalid data → error response has `code` field populated
- Login flow: wrong credentials → error response has `code: 'UNAUTHORIZED'`
- Onboarding: save a step → success path still works
- Swipe: swipe on a user → success path still works
- Genre sync: trigger sync → success path still works
- Network tab: all API calls still go to the same URLs with same headers
- Console: no more raw `fetch()` calls outside `lib/api.ts` (except NextAuth internal calls and Cloudinary)

---

### - [x] Batch C — Per-Field Validation Error Display

**Priority**: P0
**Depends on**: Batch B
**Files to create/modify**: `lib/formErrors.ts`, `app/register/page.tsx`, `app/reset-password/page.tsx`, onboarding step components

#### Context

The backend sends `VALIDATION_ERROR` with a `fields` map (`{ email: "must not be blank", password: "must contain special character" }`). The frontend shows a single generic error string for all errors. All forms use React Hook Form which has `setError(fieldName, { message })` — this just needs to be wired up.

#### Scope

- Backend validation errors with per-field details are not parsed or displayed
- Forms show a single banner error even for multi-field validation failures

#### Implementation Tasks

1. Create `lib/formErrors.ts`:

```typescript
import { UseFormSetError } from 'react-hook-form';
import { ErrorCode } from '@/types/error';

/**
 * Maps backend field-level validation errors to React Hook Form field errors.
 * Falls back to a global error message for non-validation errors.
 */
export function applyBackendErrors(
  error: { code?: string; message: string; fields?: Record<string, string> | null },
  setError: UseFormSetError<any>,
  setGlobalError: (msg: string) => void
): void {
  if (error.code === ErrorCode.VALIDATION_ERROR && error.fields) {
    let fieldSet = false;
    for (const [field, message] of Object.entries(error.fields)) {
      setError(field, { type: 'server', message });
      fieldSet = true;
    }
    if (!fieldSet) {
      setGlobalError(error.message);
    }
  } else {
    setGlobalError(error.message);
  }
}
```

2. Apply in `app/register/page.tsx`:
   - Replace `setError(result.error.message)` with `applyBackendErrors(result.error, form.setError, setError)`
   - Ensure the form's `<FormMessage />` components render field-level errors

3. Apply in `app/reset-password/page.tsx`:
   - On password validation failure, set error on the password field

4. Apply in onboarding step components that submit to server actions:
   - `BasicProfileStep.tsx` (name, dateOfBirth, gender, sexualOrientation)
   - `LifestyleStep.tsx` (relationshipStatus)
   - `PersonalityStep.tsx` (bio)
   - `DatingPreferencesStep.tsx` (minAge, maxAge, maxDistanceKm, etc.)
   - `PrivacySettingsStep.tsx` (boolean fields)

5. Ensure shadcn `FormMessage` components already display errors from React Hook Form field state (they do by default via `useFormField` context).

#### Verification

- Register with blank email + short password → both fields show their own error message below the input (not just a single banner)
- Register with valid email but weak password → only password field shows error
- Onboarding basic profile: submit with missing required field → field-level error appears
- Non-validation errors (e.g. `EMAIL_EXISTS`) still show as a global banner above the form

---

### - [x] Batch D — 403 Email Verification Interceptor

**Priority**: P0
**Depends on**: Batch B
**Files to modify**: `lib/api.ts`, `app/hooks/useMatching.ts`, `app/hooks/usePreferences.ts`

#### Context

The backend's `EmailVerificationFilter` returns `403 {"error": "Email verification required"}` on all endpoints except `/auth/`, `/onboarding/`, and `/public/` paths. The frontend has an `EmailVerificationBanner` component but no response-level interceptor. When an unverified user hits a protected endpoint (e.g. discover page), the API call fails silently with a generic error.

#### Scope

- No 403 email verification response handling in any fetch call
- API calls from `useMatching` and `usePreferences` fail with generic errors for unverified users

#### Implementation Tasks

1. In `lib/api.ts` shared response parser, add detection:
   - If `response.status === 403` and parsed body message contains `"Email verification"` or `code === 'FORBIDDEN'`:
   - Set a special error code in the returned `ApiError`: `code: 'EMAIL_VERIFICATION_REQUIRED'`

2. Create a small utility or constant for this check so consumer code can test:
   ```typescript
   export function isEmailVerificationError(error: ApiError['error']): boolean {
     return error.status === 403 && error.code === 'EMAIL_VERIFICATION_REQUIRED';
   }
   ```

3. In `app/hooks/useMatching.ts`:
   - After any failed fetch, check `isEmailVerificationError()`
   - If true: show a Sonner toast "Please verify your email to continue" and do NOT sign out
   - Set a state flag `emailVerificationRequired: true` that the discover page can read to show a blocking overlay

4. In `app/hooks/usePreferences.ts`:
   - Same pattern: check and toast, don't sign out

5. Ensure the existing `EmailVerificationBanner` in the layout still works as a passive reminder. The interceptor is the active enforcement layer.

#### Verification

- Unverified email user loads `/discover` → toast "Please verify your email" appears, page shows graceful empty state (not a crash or sign-out)
- Unverified email user loads `/matches` → same behavior
- Verified email user → no change in behavior, everything works normally
- Onboarding still works for unverified users (exempt path — no 403)

---

### - [x] Batch E — Auth-Specific Error Code Handling

**Priority**: P0
**Depends on**: Batch B
**Files to modify**: `app/login/page.tsx`, `app/register/page.tsx`, `app/reset-password/page.tsx`, `app/verify-email/page.tsx`

#### Context

Several auth-related backend error codes produce specific UX that the frontend currently doesn't implement:
- `ACCOUNT_LOCKED` → login page shows generic "Invalid credentials" instead of lockout message
- `EMAIL_EXISTS` → register page shows generic error instead of "already registered" with login link
- `INVALID_TOKEN` → reset/verify pages don't distinguish expired vs. malformed tokens

#### Scope

- Login: `ACCOUNT_LOCKED` not handled (shows "Invalid email or password")
- Register: `EMAIL_EXISTS` not handled (shows generic error)
- Reset password: `INVALID_TOKEN` not handled specifically
- Verify email: `INVALID_TOKEN` not handled specifically

#### Implementation Tasks

1. **Login page** (`app/login/page.tsx`):
   - Currently uses `signIn('email-password', ...)` which goes through NextAuth.
   - Problem: NextAuth credentials provider collapses all errors into `CredentialsSignin`.
   - Solution: Call the login server action first to get structured error. On success, then call `signIn()`. On failure, switch on `error.code`:
     - `ACCOUNT_LOCKED` → show warning-styled message: "Account temporarily locked due to too many failed attempts. Please try again later."
     - `UNAUTHORIZED` → show "Invalid email or password"
     - Default → show `error.message`

2. **Register page** (`app/register/page.tsx`):
   - After `registerWithEmail()` returns an error, switch on `error.code`:
     - `EMAIL_EXISTS` → show "This email is already registered." with a `<Link href="/login">Log in instead</Link>`
     - `VALIDATION_ERROR` → delegate to `applyBackendErrors()` (from Batch C)
     - Default → show `error.message`

3. **Reset password page** (`app/reset-password/page.tsx`):
   - On error from `resetPassword()`, switch on `error.code`:
     - `INVALID_TOKEN` → show "This reset link has expired or is invalid." with a `<Link href="/forgot-password">Request a new one</Link>`
     - Default → show `error.message`

4. **Verify email page** (`app/verify-email/page.tsx`):
   - On error from `verifyEmail()`, switch on `error.code`:
     - `INVALID_TOKEN` → show "This verification link has expired." with the resend button prominently displayed
     - Default → show `error.message`

#### Verification

- Login with a locked account (>N failed attempts) → see lockout message (not "invalid credentials")
- Register with an existing email → see "already registered" with a login link
- Click an expired password reset link → see "expired" message with link to request new one
- Click an expired email verification link → see "expired" message with resend button

---

### - [ ] Batch H — Account Deletion Password Fix

**Priority**: P0
**Depends on**: Nothing
**Files to modify**: `app/profile/settings/page.tsx`

#### Context

`DELETE /api/v1/users/me` requires `{ password }` in the request body for EMAIL auth users. Spotify-only users can omit it. The frontend settings page currently sends no body.

#### Scope

- Account deletion for email users fails or is insecure (no password confirmation)
- Settings page deletion dialog doesn't differentiate between auth providers

#### Implementation Tasks

1. In `app/profile/settings/page.tsx`, in the deletion dialog:
   - Check `session.authProvider`:
     - If `'EMAIL'`: show a password input field in the confirmation dialog. Label: "Enter your password to confirm deletion"
     - If `'SPOTIFY'`: keep current "type DELETE" confirmation (no password needed)
   - Update the fetch call to include the body:
     ```typescript
     const body = authProvider === 'EMAIL' ? JSON.stringify({ password }) : undefined;
     ```

2. Handle error responses in the dialog:
   - `UNAUTHORIZED` (wrong password) → show "Incorrect password" below the password input
   - Clear the password field on error so user can retry

3. Keep the "type DELETE" confirmation for Spotify users as-is (or simplify to a single "Are you sure?" with confirm button).

#### Verification

- Email user: deletion dialog shows password input, submitting wrong password shows "Incorrect password", correct password deletes account and signs out
- Spotify user: deletion dialog works without password field
- Network tab: EMAIL deletion sends `{ password: "..." }` in request body; Spotify deletion sends no body

---

## Phase 2 — Feature Completion (P1)

---

### - [x] Batch F — Matching Error Code Handling

**Priority**: P1
**Depends on**: Batch B
**Files to modify**: `app/hooks/useMatching.ts`

#### Context

Several matching-specific error codes from the backend are not handled, causing generic error messages or silent failures on edge cases.

#### Scope

- `DUPLICATE_SWIPE` (409): double-swipe race condition shows generic error
- `NOT_FOUND` (404): swiped user deleted mid-session shows generic error
- `FORBIDDEN` (403): blocked relationship on score fetch shows generic error

#### Implementation Tasks

1. In `useMatching.ts` swipe handler, after a failed swipe request, switch on `error.code`:
   - `DUPLICATE_SWIPE` → silently advance to next card (no error toast). The user already swiped — this is a harmless race condition.
   - `NOT_FOUND` → remove card from queue, show toast: "This user is no longer available"
   - Default → show toast with `error.message`

2. In `useMatching.ts` score fetch handler:
   - `FORBIDDEN` → return a special state so the UI shows "Compatibility unavailable" instead of error
   - `INVALID_ARGUMENT` → log only (self-score edge case, shouldn't happen in normal flow)

3. In `useMatching.ts` unmatch handler:
   - `NOT_FOUND` → toast "Match no longer exists", refresh match list
   - `FORBIDDEN` → toast "Unable to unmatch"

#### Verification

- Trigger double-swipe (rapidly click like twice) → no error toast, card advances normally
- Swipe on a user who deleted their account between page load and swipe → toast "no longer available", next card shown
- Attempt to view score for a user who blocked you → "Compatibility unavailable" shown
- Unmatch an already-unmatched user → toast + list refreshes

---

### - [x] Batch G — Spotify Error Code Handling

**Priority**: P1
**Depends on**: Batch B
**Files to modify**: `app/hooks/usePreferences.ts`, `lib/api.ts`

#### Context

When a user's Spotify refresh token is revoked (or Spotify is down), the backend returns specific error codes. The frontend currently either signs the user out (wrong) or shows a generic error.

#### Scope

- `SPOTIFY_TOKEN_EXPIRED` (401): frontend signs out instead of prompting Spotify re-auth
- `SPOTIFY_UNAVAILABLE` (502): frontend shows generic error instead of "try again later"

#### Implementation Tasks

1. **Critical**: In `lib/api.ts`, the 401 handling must NOT auto-sign-out when `code === 'SPOTIFY_TOKEN_EXPIRED'`. This is a Spotify auth issue, not an app auth issue. The user's app JWT is still valid.

2. In `app/hooks/usePreferences.ts` genre sync handler:
   - On `SPOTIFY_TOKEN_EXPIRED`: show toast "Your Spotify connection has expired." with an action button that navigates to `/api/spotify/connect`
   - On `SPOTIFY_UNAVAILABLE`: show toast "Spotify is temporarily unavailable. Try again later."

3. In any other code that calls Spotify-dependent backend endpoints (e.g. `GET /user/artists`, `GET /user/tracks`):
   - Same handling pattern

4. In `useMatching.ts`: if a 401 error has `code === 'SPOTIFY_TOKEN_EXPIRED'`, do NOT call `signOut()` — show the reconnect prompt instead.

#### Verification

- Revoke Spotify access externally → attempt genre sync → see "connection expired" toast with reconnect button (NOT a sign-out)
- Spotify API outage → attempt genre sync → see "temporarily unavailable" toast
- Non-Spotify 401 (expired app JWT) → still triggers sign-out as before

---

### - [x] Batch I — Rate Limit UI for Swipes & Score

**Priority**: P1
**Depends on**: Nothing (can use raw status code check; Batch B makes it cleaner but isn't strictly required)
**Files to modify**: `app/hooks/useMatching.ts`, `app/discover/page.tsx`

#### Context

Backend rate limits: 60 swipes/min, 30 score calculations/min. `useMatching.ts` silently catches 429 errors with no user feedback. Users can trigger this during rapid swiping.

#### Scope

- No "slow down" UI when rate limited
- Swipe buttons don't disable during cooldown
- Optimistic UI advance isn't rolled back on 429

#### Implementation Tasks

1. In `useMatching.ts`:
   - Add state: `rateLimited: boolean`, `rateLimitResetAt: number | null`
   - In swipe handler, on 429 response:
     - Parse `Retry-After` header for cooldown seconds (default 10s)
     - Set `rateLimited = true` and `rateLimitResetAt = Date.now() + seconds * 1000`
     - Roll back the optimistic UI advance (card stays visible)
     - Set a timeout to clear `rateLimited` after cooldown
   - In score fetch handler, on 429:
     - Set a score-specific rate limit flag
   - Export `rateLimited` state for consumers

2. In `app/discover/page.tsx`:
   - When `rateLimited === true`: disable all swipe buttons, show a toast or inline message "You're swiping too fast! Take a breather."
   - Optionally show a countdown timer
   - When cooldown expires: re-enable buttons

3. In score breakdown UI (ProfileSheet):
   - When score rate limited: show "Try again shortly" instead of loading spinner

#### Verification

- Swipe rapidly in quick succession → at some point 429 triggers → toast appears, buttons disable, current card stays visible
- Wait for cooldown → buttons re-enable, can swipe again
- Open many score breakdowns rapidly → rate limit toast, retry message shown

---

### - [x] Batch J — Block User UI

**Priority**: P1
**Depends on**: Nothing
**Files to modify**: `app/discover/page.tsx`, `app/profile/[id]/page.tsx`, `app/matches/page.tsx`

#### Context

The `block` swipe action is typed in `VALID_SWIPE_ACTIONS` and the backend fully supports it (prevents future interactions, auto-unmatches), but no UI trigger exists. Users have no way to block someone.

#### Scope

- No block button/gesture on discover page
- No block option on profile view
- No block option in match list

#### Implementation Tasks

1. **Discover page** (`app/discover/page.tsx`):
   - Add a "Block" option — a small icon button or inside the profile sheet's overflow menu (not prominent, to prevent accidental blocks)
   - Show confirmation dialog: "Block this user? They won't appear in your feed and any existing match will be removed. This cannot be undone."
   - On confirm: call the swipe function with `action: 'block'`, advance to next card

2. **Profile page** (`app/profile/[id]/page.tsx`):
   - Add a "Block User" option in a dropdown/overflow menu at the top
   - Same confirmation dialog
   - After blocking: navigate back to the referring page (matches or discover)

3. **Match list** (`app/matches/page.tsx`):
   - Add "Block" as an option alongside the existing "Unmatch" button (e.g. in a dropdown menu)
   - Same confirmation dialog
   - After blocking: remove from match list, show toast "User blocked"

4. Use a shared `BlockConfirmDialog` component to avoid duplicating the dialog across 3 pages.

#### Verification

- Block from discover → card disappears, confirmation toast, user doesn't reappear
- Block from profile view (navigated from matches) → redirects back, user removed from matches
- Block from match list → match card removed, toast shown
- Attempt to swipe on a blocked user (if somehow cached) → handled gracefully

---

### - [x] Batch K — Match List Pagination

**Priority**: P1
**Depends on**: Nothing
**Files to modify**: `app/hooks/useMatching.ts`, `app/matches/page.tsx`

#### Context

`GET /matching/matches` supports `limit` + `offset` query params. The frontend fetches all matches in one call with no pagination. This will break or slow down for users with many matches.

#### Scope

- Match list fetch has no offset/limit parameters
- No "Load More" or infinite scroll for matches
- Filter change (active → all) doesn't reset pagination

#### Implementation Tasks

1. In `useMatching.ts`:
   - Add to `fetchMatches()`: `limit` param (default 20) and `offset` tracking
   - Add state: `matchesOffset: number`, `matchesHasMore: boolean`, `matchesTotal: number`
   - Add function: `fetchMoreMatches()` — increments offset, appends to existing list
   - On filter change (status param changes): reset offset to 0, replace list

2. In `app/matches/page.tsx`:
   - At the bottom of the match list, render a "Load More" button when `matchesHasMore === true`
   - Show loading spinner on the button while fetching
   - Alternatively: use an `IntersectionObserver` for infinite scroll (simpler UX)
   - Append newly loaded matches below existing ones

3. Ensure unmatch/block removes the item from the local list without re-fetching the entire paginated set.

#### Verification

- User with >20 matches: sees first 20 matches + "Load More" button
- Click "Load More": next 20 append below, button disappears if no more
- Switch from "Active" to "All": list resets and loads fresh from offset 0
- Unmatch a user: card removed from list, no full re-fetch

---

## Phase 3 — UX Polish (P2)

---

### - [ ] Batch L — Match Card Metadata (matchSource, conversationStarted, null matchScore)

**Priority**: P2
**Depends on**: Nothing
**Files to modify**: `types/phase3.d.ts`, `app/matches/page.tsx` (match card component)

#### Context

Three pieces of metadata are fetched from the backend but never rendered: match source (how the match happened), conversation status, and the score can be null (directional scoring).

#### Scope

- `matchSource` fetched but not displayed (values: `"mutual_swipe"`, `"super_like"`, `"algorithm_boost"`)
- `conversationStarted` fetched but not displayed
- `matchScore` typed as `number` but can be `null` when reverse score not yet computed

#### Implementation Tasks

1. Update `MatchListItemDto` in `types/phase3.d.ts`:
   - Change `matchScore: number` to `matchScore: number | null`

2. In the match card UI (`app/matches/page.tsx`):
   - If `matchSource === 'super_like'` → show a small star icon/badge on the card
   - If `matchSource === 'algorithm_boost'` → show a sparkle icon/badge
   - `'mutual_swipe'` → no badge (default)
   - If `conversationStarted === true` → show a small chat bubble icon
   - If `matchScore === null` → show "—" or "Calculating..." text where the score badge normally is, instead of "0" or NaN

3. Keep badges subtle — small icons, not full labels. They're informational, not primary.

#### Verification

- A match from a super-like shows star badge
- A match from algorithm boost shows sparkle badge
- A mutual swipe match shows no special badge
- A match where the other user hasn't been scored yet shows "—" instead of score
- A match with an active conversation shows chat indicator

---

### - [x] Batch M — X-Correlation-Id Support

**Priority**: P2
**Depends on**: Batch B (add it in the centralized wrapper)
**Files to modify**: `lib/api.ts`

#### Context

The backend generates a `X-Correlation-Id` UUID on every response (exposed via CORS). The frontend doesn't send or capture it. This is useful for debugging: when a user reports an error, the correlation ID lets you find the exact backend log.

#### Scope

- Frontend doesn't generate or send `X-Correlation-Id` on requests
- Frontend doesn't capture or log it from responses
- Error toasts don't include an error reference ID

#### Implementation Tasks

1. In `lib/api.ts` centralized wrapper:
   - Before each request, generate a UUID (use `crypto.randomUUID()`) and add it as `X-Correlation-Id` header
   - After receiving a response, read `response.headers.get('X-Correlation-Id')`
   - On error responses: include the correlation ID in the `ApiError` object (add optional `correlationId?: string` field)
   - On error responses: `console.error` the correlation ID alongside error details

2. Add `correlationId?: string` to the `ApiError.error` type in `types/auth.ts`.

3. For 500 errors specifically: if showing a toast, append "Error ID: {short-id}" (first 8 chars) so users can report it.

#### Verification

- Make any API call → request includes `X-Correlation-Id` header (check Network tab)
- Trigger a backend error → console log includes the correlation ID
- Trigger a 500 error → toast includes a short error ID
- Backend logs show the same correlation ID as the frontend logged

---

### - [x] Batch N — Cleanup: Deprecated Fields & Character Limits

**Priority**: P2
**Depends on**: Nothing
**Files to modify**: `app/hooks/useMatching.ts`, `app/onboarding/components/steps/PersonalityStep.tsx`, `app/serverActions/onboarding.ts`

#### Context

Minor mismatches between frontend behavior and what the backend actually supports. None of these cause errors, but they limit users unnecessarily or send dead fields.

#### Scope

- Frontend sends `matchScore` in swipe request body (deprecated — backend ignores it)
- Frontend doesn't send `platform` field in swipe request (backend defaults to "web")
- `lookingForText` limited to 200 chars in frontend; backend allows 500
- `favoriteQuote` limited to 200 chars in frontend; backend allows 300
- `conversationStarters` limited to 300 chars in frontend; backend allows 500
- `getOnboardingProgress()` calls deprecated `GET /onboarding/progress` endpoint

#### Implementation Tasks

1. In `app/hooks/useMatching.ts`, swipe request body:
   - Remove `matchScore` field from the POST body
   - Add `platform: 'web'` field

2. In `app/onboarding/components/steps/PersonalityStep.tsx`, update Zod schema and UI character counters:
   - `lookingForText`: max 200 → 500
   - `favoriteQuote`: max 200 → 300
   - `conversationStarters`: max 300 → 500

3. In `app/serverActions/onboarding.ts`:
   - Remove the `getOnboardingProgress()` function (or refactor it to call `getCompleteProfile()` internally)
   - Update any callers of `getOnboardingProgress()` to use `getCompleteProfile()` instead

#### Verification

- Swipe request in Network tab: body contains `platform: "web"`, no `matchScore` field
- Personality step: can type up to 500 chars in "Looking For", 300 in "Favorite Quote", 500 in "Conversation Starters"
- Character counters in the UI reflect the new limits
- Onboarding progress check calls `/onboarding/profile` (not `/onboarding/progress`)
- Full build passes: `npm run build`

---

## Implementation Notes for Agents

### General Rules

1. **Always run `npm run build` after completing a batch** to verify no type errors or build failures.
2. **Do not modify files outside the batch scope** unless absolutely necessary for a fix.
3. **Mark the batch checkbox in this file** when complete (change `- [ ]` to `- [x]` in both the batch header and the status table).
4. **If a batch depends on an incomplete batch**, stop and note the blocker — do not implement both in one session.
5. **Preserve existing behavior** — batches are additive. Existing error messages, toasts, and flows should still work; these batches add specificity on top.

### Import Paths

- Types: `@/types/error`, `@/types/auth`, `@/types/phase3.d.ts`
- API wrapper: `@/lib/api`
- Form errors: `@/lib/formErrors`
- Error codes: `import { ErrorCode } from '@/types/error'`

### Backend Reference

Full backend API spec: `C:\Users\MladenHangi\dating-app-docs\BACKEND_PROJECT_STATUS.md`
