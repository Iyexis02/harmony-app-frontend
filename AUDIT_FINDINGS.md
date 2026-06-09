# Codebase Audit Findings
> Generated: 2026-03-09 | Total Issues: 46

---

## 🔴 CRITICAL (Fix First)

| # | File | Issue | Impact |
|---|------|-------|--------|
| 1 | `app/api/auth/[...nextauth]/route.ts` | Spotify tokens, emails, and user IDs logged via `console.log()` in `storeTokens()` | Token exposure in server logs — credential leak |
| 2 | `app/api/auth/[...nextauth]/route.ts` | 10+ debug `console.log` statements in auth flow ("SES PRE RETURN", "Spotify token expired", etc.) | Pollutes production logs, exposes internal logic |
| 3 | `app/serverActions/onboarding.ts` | `console.log('SES', session)` and `console.log('called?')` | Session data logged in production |
| 4 | `app/discover/page.tsx` | Keyboard shortcuts (←/→/↑) can queue multiple swipes if `swipe()` is slow — no debounce/guard flag | User accidentally swipes multiple profiles |
| 5 | `app/analytics/page.tsx` | Division by zero: `totalLikes / totalSwipes` when `totalSwipes === 0` → `NaN`/`Infinity` in progress bar width | Broken layout on brand-new accounts |
| 6 | `app/api/auth/[...nextauth]/route.ts` | `return { ... } as any` in credentials provider — type safety bypassed | Runtime errors if token shape is wrong |

---

## 🟠 HIGH

| # | File | Issue | Impact |
|---|------|-------|--------|
| 7 | `app/components/EmailVerificationBanner.tsx` | `session.emailVerified !== false` hides banner for `null`/`undefined` — should be `=== true` | Unverified users never see the verification banner |
| 8 | `app/hooks/useMatching.ts` | `unmatch()` updates UI optimistically with no rollback on backend failure | UI shows match deleted even if server rejects it |
| 9 | `app/hooks/useMatching.ts` | `hasMoreMatches` only checks local array — doesn't reflect server pagination state | "More matches available" shown incorrectly |
| 10 | `app/hooks/useAutoSave.ts` | Failed auto-saves are silently swallowed — error never surfaced to component | User thinks data saved; it wasn't |
| 11 | `app/analytics/page.tsx` | `fetchAnalytics` in `useEffect` dep array — function recreated each render, risk of infinite re-fetch loop | Analytics could hammer the backend |
| 12 | `app/reset-password/page.tsx` | `setTimeout(() => router.push('/'), 3000)` after reset — no unmount cleanup via `clearTimeout` | Memory leak / state update on unmounted component |
| 13 | `app/serverActions/onboarding.ts` | `Promise.allSettled()` for genre sync — failures silently ignored, no feedback to user | Music preferences may not be saved; user won't know |
| 14 | `app/onboarding/components/steps/PhotosStep.tsx` | Cloudinary public ID extraction via `split('/')` — fragile string parsing, fails on non-standard URLs | Orphaned images in Cloudinary; deletion appears to succeed but doesn't |

---

## 🟡 MEDIUM

| # | File | Issue | Impact |
|---|------|-------|--------|
| 15 | `app/edit-profile/page.tsx` | Full `loadProfile()` called after every section save — 8 redundant API calls on busy editing sessions | Excessive server load; slow UX after each save |
| 16 | `app/matches/page.tsx` | No debounce on tab filter switch — rapid clicking fires multiple concurrent `fetchMatches()` | Race condition; could display wrong filter's results |
| 17 | `app/discover/page.tsx` | No visual feedback on manual refresh — `handleRefresh()` fires silently | User clicks Refresh multiple times thinking it didn't work |
| 18 | `app/reset-password/page.tsx` | Token not validated upfront — form renders even if `?token=` param is missing; error only shown after submit | Confusing UX for broken/expired links |
| 19 | `app/onboarding/components/steps/MusicPreferencesStep.tsx` | No error shown if `fetchRecommendedGenres()` fails | Genre suggestions empty with no explanation |
| 20 | `app/layout.tsx` | `pb-16` (BottomNav padding) applied to ALL pages including landing/auth where BottomNav is hidden | Wastes vertical space on unauthenticated pages |
| 21 | `app/matches/page.tsx` | Initial render briefly shows empty state before `loading` state kicks in | Flicker of "No matches" before data loads |
| 22 | `app/matches/page.tsx` | Framer Motion `staggerChildren: 0.05` on potentially 100+ match cards | Layout jank with large match lists |
| 23 | `app/edit-profile/sections/BasicInfoSection.tsx` | Age calc `getFullYear() - getFullYear()` ignores birthday month — can be off by 1 year | User born in Dec calculated younger than actual |
| 24 | `next.config.ts` | `// TODO - remove later` on `picsum.photos` remote pattern — placeholder domain left in production | External image domain unintentionally allowed |

---

## ♿ ACCESSIBILITY

| # | File | Issue | Impact |
|---|------|-------|--------|
| 25 | `app/discover/components/SwipeCard.tsx` | Photo prev/next `<button>` elements have no `aria-label` | Screen readers can't identify button purpose |
| 26 | App-wide BottomNav | No `aria-current="page"` on active nav item | Screen readers can't tell which page is active |
| 27 | All badge chip toggles (onboarding + edit-profile) | No `role="button"`, `tabIndex`, or `onKeyDown` on `<Badge>` chips used as interactive toggles | Keyboard-only users can't interact with chip selectors |
| 28 | `app/edit-profile/page.tsx` | Save/error notification bar has no ARIA live region | Screen reader users miss save confirmations |

---

## 🔒 SECURITY

| # | File | Issue | Impact |
|---|------|-------|--------|
| 29 | `app/api/auth/[...nextauth]/route.ts` | Spotify access/refresh tokens logged in `storeTokens()` | Tokens accessible to anyone with server log access |
| 30 | `next.config.ts` | `remotePatterns` allows `picsum.photos` — not locked to Cloudinary only | Unintended external image sources can render in `<Image>` |
| 31 | `app/api/auth/[...nextauth]/route.ts` | JWT generation — no visible expiration set in `generateToken()` | If expiry missing, tokens valid indefinitely |

---

## 🗑️ DEAD CODE / CONSOLE LOGS

| # | File | Issue |
|---|------|-------|
| 32 | `app/api/auth/[...nextauth]/route.ts` | 10+ `console.log` calls throughout auth flow |
| 33 | `app/serverActions/onboarding.ts` | `console.log('SES', session)`, `console.log('called?')` |
| 34 | `app/onboarding/page.tsx` | Multiple `console.log` for onboarding progress |
| 35 | `app/components/Login.tsx` | `console.log(user)` |
| 36 | `lib/cloudinary.ts` | `console.log('response ', response)` in upload function |

---

## ⚡ PERFORMANCE

| # | File | Issue | Impact |
|---|------|-------|--------|
| 37 | `app/analytics/page.tsx` | `useCountUp` hook not memoized — re-runs even if target unchanged | Unnecessary `requestAnimationFrame` calls |
| 38 | `app/profile/page.tsx` | `sticky top-6` left column in a grid layout | Potential CLS (Cumulative Layout Shift) on narrow screens |
| 39 | `app/matches/page.tsx` | No pagination on match list — all matches loaded at once | Slow render and high memory on users with 100+ matches |

---

## 🔲 EDGE CASES / MISSING VALIDATION

| # | File | Issue | Impact |
|---|------|-------|--------|
| 40 | `app/discover/page.tsx` | No handling when `currentMatchIndex` exceeds `potentialMatches.length` — blank card instead of empty state | Confusing white screen between card and empty state |
| 41 | `app/edit-profile/sections/BasicInfoSection.tsx` | Age validation doesn't account for leap years or timezone offset | Users near the 18-year boundary may be incorrectly rejected |
| 42 | `app/onboarding/components/steps/LocationStep.tsx` | ~~`searchCroatiaCities()` and default country "Croatia" — geography hardcoded~~ | **Not a bug — intentional scope for current launch** |
| 43 | `app/reset-password/page.tsx` | No upfront token validation — form shown even when `?token=` param is missing or expired | User fills form, submits, then gets error — bad UX |
| 44 | `app/matches/page.tsx` | `fetchMatches()` can show stale loading=false on initial render | Empty state flickers before loading begins |
| 45 | `app/onboarding/page.tsx` | `STARTED` stage not in `NEXT_STEP_MAP` — unhandled edge case | Could redirect to wrong onboarding step |
| 46 | `app/components/EmailVerificationBanner.tsx` | Banner hidden when `emailVerified` is `null` (should only hide when `=== true`) | Unverified users bypass verification prompt |

---

## Fix Priority

### Immediate (before any deploy)
- [x] Remove all `console.log` calls — **especially** token/session logging in auth
- [x] Fix `totalSwipes === 0` division-by-zero in analytics progress bars
- [x] Fix `emailVerified !== false` → `=== true` in EmailVerificationBanner
- [x] Add `clearTimeout` cleanup to reset-password redirect timer
- [x] Add keyboard swipe debounce/guard flag in Discover page

### This Sprint
- [x] Add optimistic rollback to `unmatch()` on backend failure — N/A: state already updated only on success
- [x] Surface auto-save errors to the user — `useAutoSave` now returns `saveError`
- [x] Remove full `loadProfile()` reload after each section save — background refresh, no loading spinner
- [x] Add debounce to match filter tab switching — 300ms debounce via `useDebounce`
- [x] Add `aria-label` to SwipeCard photo navigation buttons
- [x] Add `role="button" tabIndex={0} onKeyDown` to Badge chip toggles — auto-applied in Badge component when `onClick` is present
- [ ] Validate `?token=` param before showing reset-password form — missing token already handled; expired token cannot be validated upfront without a backend call
- [x] Remove `picsum.photos` from `next.config.ts` remotePatterns (replaced with Cloudinary)

### Backlog
- [ ] Add structured logging (replace all `console.log`)
- [ ] Implement JWT expiration in `generateToken()`
- [ ] Add end-to-end tests for auth and swipe flows
- [ ] Add pagination to match list
- [ ] Memoize `useCountUp` hook
