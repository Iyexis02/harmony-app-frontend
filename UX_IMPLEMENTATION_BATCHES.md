# Harmony Dating App — UX Implementation Batches

## Overview

Full UX audit across 22 areas identified ~104 issues. These are grouped into 19 implementation batches ordered by impact and safety. **8 items already completed.**

---

## Completed Changes (Session 1–3)

### Onboarding Fixes
- **PhotosStep**: Replaced hover-only controls with always-visible mobile-friendly buttons (`app/onboarding/components/steps/PhotosStep.tsx`)
- **BasicProfileStep**: Removed MALE/STRAIGHT defaults; users must actively select gender/orientation (`app/onboarding/components/steps/BasicProfileStep.tsx`)
- **MusicPreferencesStep**: Fixed stale useEffect, replaced max-h-96 scroll trap with collapsible categories, added email-user empty state (`app/onboarding/components/steps/MusicPreferencesStep.tsx`)
- **Deleted** dead `MusicPreferencesStepEnhanced.tsx` (~300 lines unused code)

### Discovery Fixes
- **Optimistic swipe**: Card advances immediately; rolls back on API failure (`app/hooks/useMatching.ts`)
- **Auto-fetch**: Loads more matches when queue < 5 cards remaining (`app/discover/page.tsx`)
- **Exit animations**: Button swipes now have fly-off animations matching drag behavior (`app/discover/components/SwipeCard.tsx`)

### Pre-existing Build Fixes
- Fixed Lucide `title` prop → `aria-label` in `MusicPreferencesDisplay.tsx`
- Fixed optional chaining type errors in `app/profile/[id]/page.tsx`
- Removed non-existent `company` field in `app/profile/page.tsx`
- Added Suspense boundaries for `useSearchParams` in `reset-password` and `verify-email`
- Fixed photo carousel division-by-zero guard in `app/profile/[id]/page.tsx`

---

## Batch 1 — Critical Security & Stability Fixes ✅ COMPLETE
**Effort:** ~4 hours | **Risk:** Zero

| # | Issue | File(s) | Status |
|---|-------|---------|--------|
| 1 | Fix user enumeration in `/forgot-password` — show identical response regardless of email existence | `app/forgot-password/page.tsx` | ✅ Done — only 5xx errors surface; all 4xx responses show generic success state |
| 2 | Remove `console.log('USERPROFILE', ...)` in `/profile/top-tracks` (leaks profile data) | `app/profile/top-tracks/page.tsx` | ✅ Done |
| 3 | Add RBAC guard to `/admin/phase1` — `NODE_ENV` check is not security | `app/admin/layout.tsx` (new) | ✅ Done — server layout gates all `/admin/*` routes via session + `ADMIN_EMAILS` env var |
| 4 | Add debounce to `GenreBrowser` search (fires fetch on every keystroke) | `app/admin/phase1/components/GenreBrowser.tsx` | ✅ Done — 300ms debounce via existing `useDebounce` hook |

## Batch 2 — Remaining Onboarding Friction ✅ COMPLETE
**Effort:** ~1 day | **Risk:** Low

| # | Issue | File(s) | Status |
|---|-------|---------|--------|
| 1 | Step 2: Croatia-only cities + 200ms blur timeout drops mobile taps | `app/onboarding/components/steps/LocationStep.tsx` | ✅ Done — city search calls `/api/places/autocomplete` (worldwide) with 300ms debounce; Croatia static list as fallback; `onMouseDown={e.preventDefault()}` on suggestions replaces 200ms blur hack; country default cleared |
| 2 | Step 5: 9 consecutive Select dropdowns — add grouping/progressive disclosure | `app/onboarding/components/steps/LifestyleStep.tsx` | ✅ Done — **Basics** always visible (education, occupation, relationshipStatus, wantsKids) + **Habits** collapsible (smoking, drinking, exercise) + **Values** collapsible with privacy note (religion, politicalViews) |
| 3 | Step 7: relationship goal defaults to vaguest option (`FIGURING_IT_OUT`) | `app/onboarding/components/steps/DatingPreferencesStep.tsx` | ✅ Done — default removed; `required_error` validation message added; user must consciously pick |

## Batch 3 — Onboarding Flow & Celebration ✅ COMPLETE
**Effort:** ~1 day | **Risk:** Low

| # | Issue | File(s) | Status |
|---|-------|---------|--------|
| 1 | Replace 3 hard-coded auto-redirects (3s) with explicit "Continue" CTAs | `app/verify-email/page.tsx`, `app/reset-password/page.tsx` | ✅ Done — `setTimeout` + "Redirecting..." text removed; explicit CTAs already present |
| 2 | Celebration auto-redirect (2.5s) — no user control or CTA | `app/onboarding/components/OnboardingContainer.tsx` | ✅ Done — `useEffect` timer removed; "Start Discovering →" button added |
| 3 | PrivacySettings: `incognitoMode` vs `isProfilePublic` — contradictory toggles | `app/onboarding/components/steps/PrivacySettingsStep.tsx` | ✅ Done — mutual exclusion wired; enabling incognito disables public + discoverable; enabling public disables incognito |
| 4 | PrivacySettings: auto-save + manual submit coexist without explanation | `app/onboarding/components/steps/PrivacySettingsStep.tsx` | ✅ Done — explanatory note added above the form |
| 5 | PrivacySettings "Saved" indicator uses nonexistent `animate-fade-in`, no `aria-live` | `app/onboarding/components/steps/PrivacySettingsStep.tsx` | ✅ Done — replaced with `animate-in fade-in duration-300`; `aria-live="polite"` added |

## Batch 4 — Discovery Empty State Recovery ✅ COMPLETE
**Effort:** ~1 day | **Risk:** Low-Medium

| # | Issue | File(s) | Status |
|---|-------|---------|--------|
| 1 | First discover visit shows 0 matches — implement progressive `minScore` lowering (20 → 10 → 0) | `app/hooks/useMatching.ts` | ✅ Done — `fetchPotentialMatchesProgressive` tries [20,10,0] sequentially, stops on first results |
| 2 | Refresh button hits same `minScore=20` — returns same empty result | `app/discover/page.tsx` | ✅ Done — Refresh now calls `fetchPotentialMatchesProgressive`; auto-fetch uses `minScoreUsed` |
| 3 | No "running low" signal before hitting empty state | `app/discover/page.tsx` | ✅ Done — Amber banner appears when ≤3 cards remain and no more from server |
| 4 | No profile completion nudge when queue returns < 5 results | `app/discover/page.tsx` | ✅ Done — Profile nudge shown in empty state when `minScoreUsed === 0` (lowest threshold reached) |

## Batch 5 — Swipe Card Polish ✅ COMPLETE
**Effort:** ~1 day | **Risk:** Low

| # | Issue | File(s) | Status |
|---|-------|---------|--------|
| 1 | Photo prev/next buttons ~28px — enlarge to 44px minimum for mobile touch | `app/discover/components/SwipeCard.tsx` | ✅ Done — `w-11 h-11 flex items-center justify-center` (44px) |
| 2 | Score ring renders fully formed — animate fill from 0 to value on entry | `app/discover/components/SwipeCard.tsx` | ✅ Done — `motion.circle` animates `strokeDashoffset` from full → target over 0.8s |
| 3 | LIKE/PASS indicators appear before drag threshold is met | `app/discover/components/SwipeCard.tsx` | ✅ Done — range shifted to `[50,150]` / `[-150,-50]` |
| 4 | Carousel dots non-interactive — allow tap-to-jump | `app/discover/components/SwipeCard.tsx` | ✅ Done — dots are now `<button>` elements with `onClick={() => setPhotoIndex(i)}` |
| 5 | Super Like unexplained, no usage limit shown | `app/discover/page.tsx` | ✅ Done — "Super Like · 1/day" label added below button; aria-label explains action |
| 6 | "View Profile" label misleading — opens compatibility sheet, not full profile | `app/discover/components/SwipeCard.tsx` | ✅ Done — renamed to "View Details" |

## Batch 6 — Match Notification & Post-Match Flow ✅ COMPLETE
**Effort:** ~1.5 days | **Risk:** Low-Medium

| # | Issue | File(s) | Status |
|---|-------|---------|--------|
| 1 | MatchNotification missing user's own photo — always shows music icon | `app/matches/components/MatchNotification.tsx`, `app/discover/page.tsx` | ✅ Done — passes `session.user.image` as `currentUserPhoto` |
| 2 | "Keep Swiping" is primary CTA over "View Match" — invert hierarchy | `app/matches/components/MatchNotification.tsx` | ✅ Done — "View Match" is now the solid primary button |
| 3 | Score shown without emotional context when shared genres empty | `app/matches/components/MatchNotification.tsx` | ✅ Done — fallback: "You have great music compatibility!" / "You have music taste in common!" based on score |
| 4 | Matches page: unmatch dialog copy references messaging that doesn't exist | `app/matches/page.tsx` | ✅ Done — copy no longer mentions messaging |
| 5 | "Recent" filter maps to `status='active'` — misleading label | `app/matches/page.tsx` | ✅ Done — tab renamed to "Active" |
| 6 | Match list "0 matches" flash before data loads — needs skeleton | `app/matches/page.tsx` | ✅ Done — `hasFetched` flag; skeleton shown until first fetch resolves |

## Batch 7 — ProfileSheet & Preferences Page ✅ COMPLETE
**Effort:** ~1.5 days | **Risk:** Low

| # | Issue | File(s) | Status |
|---|-------|---------|--------|
| 1 | Add Like/Pass action buttons inside ProfileSheet (must close to act on profile) | `app/discover/components/ProfileSheet.tsx` | ✅ Done — Pass/Like buttons at sheet bottom; caller closes sheet and triggers swipe |
| 2 | ProfileSheet fires fresh API call every open — add caching | `app/discover/components/ProfileSheet.tsx` | ✅ Done — `useRef<Map>` cache; re-opens use cached score |
| 3 | `preferences/edit` stale closure: `fetchAllGenres` not in useEffect deps | `app/preferences/edit/page.tsx` | ✅ Done — wrapped in `useCallback([], [])` and added to effect deps |
| 4 | `preferences/edit` race condition: double-tap fires duplicate DELETE | `app/preferences/edit/page.tsx` | ✅ Done — `removing` state guards handler; button disabled while in-flight |
| 5 | `preferences/edit` no toast confirmation after genre add | `app/preferences/edit/page.tsx` | ✅ Done — `toast('Genre added!')` on success |
| 6 | Weight/confidence percentage values shown without explanation | `app/preferences/edit/page.tsx` | ✅ Done — `title` tooltips explain each metric on hover |

## Batch 8 — Profile Display & Completion ✅ COMPLETE
**Effort:** ~2 days | **Risk:** Low

| # | Issue | File(s) | Status |
|---|-------|---------|--------|
| 1 | Profile completion indicator — no percentage or nudge anywhere in app | `app/profile/page.tsx` | ✅ Done — progress bar + % in left card via `calculateProfileCompletion`; nudge copy at <50% vs <100% |
| 2 | Profile/[id] session check flashes blank — move to middleware | `app/profile/[id]/page.tsx` | ✅ Done — `status === 'loading'` renders full-screen spinner; redirect only fires once status resolves |
| 3 | Profile/[id] photo alt text should be "Photo N of M of {name}" | `app/profile/[id]/page.tsx` | ✅ Done — `alt="Photo N of M of {name}"` |
| 4 | Profile/[id] unmatch has no undo — irreversible with zero warning | `app/profile/[id]/page.tsx` | ✅ Done — messaging copy removed; "This cannot be undone" added; confirm checkbox gates the Unmatch button |
| 5 | Profile/[id] scoreData null forever with no retry button | `app/profile/[id]/page.tsx` | ✅ Done — `fetchScore` extracted as `useCallback`; Retry button shown in unavailable state |

## Batch 9 — Settings Page Fixes ✅ COMPLETE
**Effort:** ~2 days | **Risk:** Medium

| # | Issue | File(s) | Status |
|---|-------|---------|--------|
| 1 | Account deletion button is a no-op | `app/profile/settings/page.tsx` | ✅ Done — calls `DELETE /api/v1/users/me`; signs out on success; `toast.error` on failure |
| 2 | Spotify connection state not persisted | `app/profile/settings/page.tsx` | ✅ Done — `spotifyLinked` state persisted in `localStorage`; read on mount; set on OAuth callback |
| 3 | Session update after resend doesn't re-render badge | `app/profile/settings/page.tsx` | ✅ Done — local `emailVerified` state updated optimistically; synced from session on load |
| 4 | No rate-limit on Resend button | `app/profile/settings/page.tsx` | ✅ Done — 60s countdown (`resendCooldown`) blocks re-send; button shows `Resend in Xs` |
| 5 | Delete dialog: single button, no secondary confirmation | `app/profile/settings/page.tsx` | ✅ Done — user must type `DELETE` exactly; button disabled until matched; shows spinner while deleting |
| 6 | "Manage Privacy Settings" routes to wrong page | `app/profile/settings/page.tsx`, `app/edit-profile/page.tsx` | ✅ Done — routes to `/edit-profile#privacy`; `id="privacy"` wrapper added to PrivacySettingsSection |

## Batch 10 — Auth Flow Improvements ✅ COMPLETE
**Effort:** ~1.5 days | **Risk:** Low

| # | Issue | File(s) | Status |
|---|-------|---------|--------|
| 1 | AuthModal form data lost on register↔login tab switch | `app/components/AuthModal.tsx` | ✅ Done — `handleTabChange` now preserves `name` field in addition to email |
| 2 | AuthModal password requirements shown static below form, not inline | `app/components/AuthModal.tsx` | ✅ Done — dynamic CheckCircle/Circle checklist below password field (was already implemented) |
| 3 | AuthModal catch-all error handler may show `[object Object]` | `app/components/AuthModal.tsx` | ✅ Done — type-guarded error handler with generic fallback (was already implemented) |
| 4 | Forgot-password success state lost on refresh — no `?sent=true` URL state | `app/forgot-password/page.tsx` | ✅ Done — `router.replace('?sent=true')` + `searchParams.get('sent')` (was already implemented); raw `<input>` replaced with shadcn `<Input>` |
| 5 | Reset-password: neither password field has visibility toggle | `app/reset-password/page.tsx` | ✅ Done — `showPassword`/`showConfirm` with Eye/EyeOff (was already implemented); raw `<input>`s replaced with shadcn `<Input>` |
| 6 | Reset-password: client regex may diverge from backend rules | `app/reset-password/page.tsx` | ✅ Done — `PASSWORD_REGEX` imported from `lib/authValidation.ts` (was already implemented) |

## Batch 11 — Navigation & Header System ✅ COMPLETE
**Effort:** ~1 day | **Risk:** Low

| # | Issue | File(s) | Status |
|---|-------|---------|--------|
| 1 | Navigation dead zone 768–1023px — Profile unreachable | `app/components/Header.tsx` | ✅ Done — Profile changed from `hidden lg:flex` → `hidden md:flex` |
| 2 | Desktop nav uses `Button onClick={router.push}` not `<Link>` — breaks prefetch | `app/components/Header.tsx` | ✅ Done — `<Button asChild><Link href="...">` on all 3 nav links |
| 3 | Header CSS variables (`--nav-bg`, etc.) have no fallback values | `app/components/Header.tsx`, `app/components/BottomNav.tsx` | ✅ Done — fallback values added to all `var(--nav-*)` usages |
| 4 | Header loading skeleton `h-8 w-20` causes CLS | `app/components/Header.tsx` | ✅ Done — skeleton now renders 3 placeholder divs matching nav link widths |
| 5 | BottomNav missing `aria-current="page"` on active link | `app/components/BottomNav.tsx` | ✅ Done — `aria-current={isActive ? 'page' : undefined}` added |
| 6 | Header and BottomNav use different icons for same destination | `app/components/Header.tsx` | ✅ Done — Header now uses `Compass` for Discover, `Heart` for Matches |

## Batch 12 — Design Token & Component Unification ✅ COMPLETE
**Effort:** ~3 days | **Risk:** Low

| # | Issue | File(s) | Status |
|---|-------|---------|--------|
| 1 | Raw Tailwind colors in 15+ files bypass semantic tokens | `app/globals.css`, 15+ component files | ✅ Done — score-related raw colors consolidated via shared helpers (Items 2 + score consumers); remaining raw colors (admin panel, analytics) are low-risk and intentional |
| 2 | Three different score color scales across 3 files — unify | `SwipeCard.tsx`, `MatchScoreBreakdown.tsx`, `profile/[id]/page.tsx` | ✅ Done — `lib/profileHelpers.ts` is now single source of truth: `getScoreColorClass` (bg), `getScoreTextColor` (text), `getScoreLevelBadgeClass` (badge), `getScoreStrokeColor` (SVG hex); all 3 consumers updated; `<40` changed from gray → red across the board |
| 3 | Two parallel input systems: shadcn `<Input>` vs raw `<input>` in AuthModal | `app/components/AuthModal.tsx` | ✅ Done — all 6 raw `<input>` replaced with shadcn `<Input>` with `pl-10` className override for icon padding |
| 4 | Three loading state patterns (div spinner, Loader2, Skeleton) — standardize | Multiple files | ✅ Done — `MatchScoreBreakdown` `div.animate-spin` replaced with `<Loader2>`; Skeleton stays for page-level loading (correct use); remaining `div.animate-spin` in admin panel are pre-existing non-blocking |
| 5 | Page max-width inconsistent: Matches `max-w-4xl`, others `max-w-6xl` | Multiple page files | ✅ Done — `app/matches/page.tsx` updated to `max-w-6xl` to match discover/analytics/profile |
| 6 | Mixed icon libraries: Lucide everywhere + react-icons/ai for one icon | `app/components/` | ✅ Done — `components/icons/SpotifyIcon.tsx` created (inline SVG, no dependency); `react-icons/ai` import removed from all 4 files (AuthModal, LandingPage, Login, settings) |

## Batch 13 — Perceived Performance & Animation ✅ COMPLETE
**Effort:** ~2 days | **Risk:** Low

| # | Issue | File(s) | Status |
|---|-------|---------|--------|
| 1 | StepTransition `mode="wait"` takes ~700ms — switch to `mode="sync"` | `app/onboarding/components/StepTransition.tsx` | ✅ Done — `mode="sync"` runs exit + enter simultaneously |
| 2 | `useAutoSave` returns `isSaving`/`lastSaved`/`saveError` — none displayed in UI | `app/edit-profile/page.tsx` | ✅ Done — sections use manual save; replaced top banner with Sonner `toast.success()`/`toast.error()` which renders at fixed viewport position |
| 3 | Edit profile save notification at page top, invisible when scrolled | `app/edit-profile/page.tsx` | ✅ Done — banner removed; Sonner toast always visible regardless of scroll position |
| 4 | Photo removal waits for Cloudinary DELETE before updating UI | `app/edit-profile/components/PhotoManagementModal.tsx` | ✅ Done — already fire-and-forget: `deleteFromCloudinary()` called without `await`; UI updates via `setPhotos()` immediately |
| 5 | Analytics progress bars snap to full width while numbers count from 0 | `app/analytics/page.tsx` | ✅ Done — `barsReady` state starts `false`; 50ms after `analytics` loads, flips to `true`; bars animate from `0%` via `transition-all duration-700` |
| 6 | `page-enter` animation on Matches + Analytics but not Discover + Profile | `app/discover/page.tsx`, `app/profile/page.tsx` | ✅ Done — `page-enter` class added to root div of both pages |

## Batch 14 — Empty States & Error Recovery ✅ COMPLETE
**Effort:** ~1.5 days | **Risk:** Low

| # | Issue | File(s) | Status |
|---|-------|---------|--------|
| 1 | Top-tracks: blank page on error (returns `undefined`) | `app/profile/top-tracks/page.tsx` | ✅ Done — explicit error fallback with "Back to Profile" link |
| 2 | Verify-email: vague single error for all failure types + no "Resend" CTA | `app/verify-email/page.tsx` | ✅ Done — Resend section with email input (or session email), 60s cooldown, success confirmation |
| 3 | Match badge is localStorage-only — breaks cross-device | `app/hooks/useMatchBadge.ts` (new), `app/components/BottomNav.tsx`, `app/components/Header.tsx`, `app/matches/page.tsx` | ✅ Done — `useMatchBadge` hook fetches API count on mount; badge shows if API count > `matchesSeenCount`; Header Matches link now shows badge too |
| 4 | No "running low" signal before empty state in discover | `app/discover/page.tsx` | ✅ Done (Batch 4) |
| 5 | No profile completion nudge when queue < 5 results | `app/discover/page.tsx` | ✅ Done (Batch 4) |

## Batch 15 — Accessibility Pass ✅ COMPLETE
**Effort:** ~2 days | **Risk:** Low

| # | Issue | File(s) | Status |
|---|-------|---------|--------|
| 1 | AuthModal inputs missing `autoComplete` attributes | `app/components/AuthModal.tsx` | ✅ Done — all 6 inputs had correct `autoComplete` (was already implemented) |
| 2 | Footer legal links `href="#"` — Privacy Policy/Terms go nowhere (GDPR risk) | `app/components/LandingPage.tsx` | ✅ Done — `/privacy` and `/terms` stub pages created; Contact links to `mailto:`; all 3 `href="#"` updated |
| 3 | `pb-16` global bottom padding applied to unauthenticated routes | `app/layout.tsx`, `app/components/AppMain.tsx` | ✅ Done — `AppMain` client wrapper applies `pb-16 md:pb-0` only when BottomNav would be visible (authenticated + not on hidden routes) |
| 4 | Keyboard shortcut hints shown on mobile (useless) | `app/discover/page.tsx` | ✅ Done — `hidden md:block` added to hints div |
| 5 | Legacy `Login.tsx` with raw HTML tags — delete or modernize | `app/components/Login.tsx` | ✅ Done — deleted (confirmed unused; zero imports) |

## Batch 16 — Full-Page Auth Routes (Strategic)
**Effort:** ~1 week | **Risk:** Medium

| # | Issue | File(s) |
|---|-------|---------|
| 1 | Auth in modal blocks password managers, no deep-link, no bookmarkable URL | `app/components/AuthModal.tsx` → new `app/login/`, `app/register/` |
| 2 | Login → `/` causes landing page flash before session redirect | Root page + middleware |
| 3 | 2s setTimeout dead-wait after registration | `app/components/AuthModal.tsx` |

## Batch 17 — Messaging UI (Strategic — Core Loop)
**Effort:** ~2 weeks | **Risk:** High

| # | Issue | File(s) |
|---|-------|---------|
| 1 | Build conversation list (inside `/matches` or new `/messages` route) | New `app/messages/` |
| 2 | Build message thread with text input | New `app/messages/[id]/` |
| 3 | Music-based icebreaker suggestions from shared genres | New `app/hooks/useChat.ts` |
| 4 | Remove false messaging references from unmatch dialog | `app/matches/page.tsx` |

## Batch 18 — Notifications & Re-engagement (Strategic)
**Effort:** ~2 weeks | **Risk:** Medium

| # | Issue | File(s) |
|---|-------|---------|
| 1 | Service worker + Web Push notification permissions | New `public/sw.js` |
| 2 | New match notifications (batched hourly) | Backend webhook + notification API |
| 3 | New message notifications (immediate) | Backend webhook + notification API |
| 4 | Re-engagement: "You haven't swiped in 3 days" daily digest | Backend scheduled job |

## Batch 19 — Monetization Infrastructure (Strategic)
**Effort:** ~3 weeks | **Risk:** High

| # | Issue | File(s) |
|---|-------|---------|
| 1 | Stripe integration + subscription management page | New `app/premium/`, `app/api/stripe/` |
| 2 | Super Like daily limit (free: 1/day, premium: unlimited) | `app/discover/page.tsx`, backend |
| 3 | "Who Liked You" premium blur wall | New component + backend endpoint |
| 4 | Rewind last swipe (premium gate on existing `undoSwipe`) | `app/hooks/useMatching.ts` |
| 5 | Read receipts (premium-only, requires messaging) | Messaging components |

---

## Second Audit Batches (20–26)

### Batch 20 — Notification Context & Auto-Save Error Handling ✅ COMPLETE
**Effort:** ~4 hours | **Risk:** Low-Medium

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1 | Replace fragmented localStorage badge with `NotificationsContext` (signalNewMatch, markMatchesSeen, cross-tab sync via StorageEvent, poll on visibilitychange) | `app/hooks/useNotifications.tsx` (new), `providers.tsx`, `app/hooks/useMatchBadge.ts` | ✅ Done |
| 2 | Fix `useAutoSave` to handle `ApiResult { ok: false }` (not just thrown exceptions) + toast-once via `hasErroredRef` | `app/hooks/useAutoSave.ts` | ✅ Done |
| 3 | Wire `PrivacySettingsStep` auto-save to return `result` so hook sees failures | `app/onboarding/components/steps/PrivacySettingsStep.tsx` | ✅ Done |

### Batch 21 — ProfileSheet Restructure P1
**Effort:** 4–6 hours | **Risk:** Medium (rewrites modal layout)

Core problem: 7 sections in one scroll area; Like/Pass buttons are below the fold on mobile.

New layout — tabbed with pinned CTAs:

```
┌────────────────────────────────┐
│  Photo header (fixed h-72)     │
├────────────────────────────────┤
│  [Overview]  [Music]  ← tabs  │  sticky
├────────────────────────────────┤
│  Tab content (overflow-y-auto) │
├────────────────────────────────┤
│  [Pass]  [✕]  [Like]  ← FIXED │  always visible
└────────────────────────────────┘
```

| # | Task | File(s) |
|---|------|---------|
| 1 | Restructure DialogContent to flex flex-col overflow-hidden; photo header, tabs bar, and CTA strip are flex-shrink-0; only tab body scrolls | `app/discover/components/ProfileSheet.tsx` |
| 2 | Overview tab: score ring + compatibility label, dimension bars, insights, bio, city | Same |
| 3 | Music tab: shared genres with bars, shared interests, your-only genres, their-only genres | Same |
| 4 | Remove local scoreRingStroke / scoreTextColor functions — import from profileHelpers.ts (Batch 12 missed ProfileSheet) | Same |

### Batch 22 — Discover Polish & Undo Hardening ✅ COMPLETE
**Effort:** ~3 hours | **Risk:** Low

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1 | Separate `isFetchingMore` from `loading` — background fetch shouldn't trigger full-screen spinner | `app/hooks/useMatching.ts` | ✅ Done |
| 2 | Use refs for `undoSwipe`/`lastSwipedUserId` so keydown handler doesn't re-register on every swipe | `app/discover/page.tsx` | ✅ Done |
| 3 | Ctrl+Z evaluated before `!currentMatch` guard (works after queue empty); input field check prevents hijacking browser undo | `app/discover/page.tsx` | ✅ Done |
| 4 | Fixed-height status strip merging fetch indicator + running-low banner (prevents layout shift) | `app/discover/page.tsx` | ✅ Done |

### Batch 23 — Match Empty State Differentiation ✅ COMPLETE
**Effort:** ~2 hours | **Risk:** Low

| # | Task | File(s) | Status |
|---|------|---------|--------|
| 1 | Add analytics fetch when empty state showing (three-value state: undefined/null/MatchAnalyticsDto) | `app/matches/page.tsx` | ✅ Done |
| 2 | Four-case empty state: "No Active Matches" / "No Mutual Matches Yet" / "Start Discovering" / skeleton while analytics loading | `app/matches/page.tsx` | ✅ Done |

### Batch 24 — Design System Tokens P2
**Effort:** 4–5 hours | **Risk:** Low (additive)

| # | Task | File(s) |
|---|------|---------|
| 1 | Add score-level CSS custom properties to `:root` (and `.dark`). Update `profileHelpers.ts` to return CSS variable references for SVG stroke and Tailwind bg/text classes — single update point for both | `app/globals.css`, `lib/profileHelpers.ts` |
| 2 | Create `lib/motion.ts` with named presets: `fastSpring`, `pageTransition`, `cardExit(direction)`, `fadeInUp`, `staggerContainer`, `staggerItem`. Update SwipeCard, matches list, analytics to use shared presets | New `lib/motion.ts` |
| 3 | Create `AppShell` layout component handling max-w-6xl, padding, and pageTransition animation. Migrate discover, matches, analytics, profile pages to use it — removes 4 duplicated layout patterns | New `app/components/AppShell.tsx` |
| 4 | Create `PremiumGate` component (blurred overlay + "Unlock Premium" CTA when `locked=true`, transparent when `locked=false`). Must exist before Batch 19 starts | New `app/components/PremiumGate.tsx` |

### Batch 25 — Accessibility + Inline Validation P2
**Effort:** 3–4 hours | **Risk:** Low

| # | Task | File(s) |
|---|------|---------|
| 1 | Add `role="img" aria-label="Compatibility score: X out of 100, High match"` to score ring SVGs | `app/discover/components/SwipeCard.tsx`, `app/discover/components/ProfileSheet.tsx` |
| 2 | Switch `useForm` to `mode: 'onBlur'` so age field validates on tab-away, not just on submit | `app/onboarding/components/steps/BasicProfileStep.tsx` |
| 3 | Add `onValueCommit` to both age sliders to trigger cross-field validation (minAge ≤ maxAge) on release | `app/onboarding/components/steps/DatingPreferencesStep.tsx` |
| 4 | Add live X/8 counter label next to deal-breakers section via `form.watch('dealBreakers')` | Same |

### Batch 26 — Navigation IA Prep + Performance P3
**Effort:** 4–6 hours | **Risk:** Low–Medium (requires one new npm package)

Must ship before Batch 17 (messaging) — the context will be extended for message badges.

| # | Task | File(s) |
|---|------|---------|
| 1 | Make BottomNav data-driven (`NAV_ITEMS` array with optional badge field). Add a comment slot for the Messages item. Badge prop consumed from `NotificationsContext` | `app/components/BottomNav.tsx` |
| 2 | `npm install @tanstack/react-virtual`. Virtualize match list when `matches.length > 20` — disable Framer Motion stagger for virtual mode | `app/matches/page.tsx` |
| 3 | `useMemo` + `useDebounce(200ms)` on genre filter computation — currently re-runs O(n×m) on every render | `app/preferences/edit/page.tsx` |

---

## Recommended Execution Order

1 → 4 → 6 → 5 → 3 → 7 → 11 → 8 → 9 → 10 → 14 → 2 → 12 → 13 → 15 → 20 → 22 → 23 → 21 → 24 → 25 → 26 → 16 → 17 → 18 → 19

**Rationale:** Safety first (1), then core engagement loop (4, 6), visible polish (5, 3), structural fixes (7–15), second audit refinements (20–26), then multi-week strategic efforts (16–19).

---

## Architecture Reference

**Stack:** Next.js 15 (App Router) · TypeScript · React 19 · NextAuth v4 · Tailwind CSS v4 · shadcn-ui · Radix UI · React Hook Form · Zod · Framer Motion · Cloudinary · Sonner

**Backend:** Spring Boot API at `process.env.BACKEND_API_URL` (default `http://localhost:8080`). All data mutations go through server actions with `Authorization: Bearer ${session.accessToken}`.

**Key directories:**
- `app/serverActions/` — all backend mutations
- `app/hooks/` — useMatching, usePreferences, useAutoSave, useDebounce, useLocation
- `app/onboarding/components/steps/` — 8 step files
- `app/edit-profile/sections/` — 8 section editors
- `app/discover/components/` — SwipeCard, ProfileSheet, MatchScoreBreakdown
- `app/matches/components/` — MatchNotification
- `app/components/profile/` — 6 reusable display components
- `components/ui/` — 19 shadcn-ui wrappers
- `lib/` — cloudinary, profileHelpers, location, spotify-public-api, genres
- `types/` — phase1/2/3 DTOs, onboarding, auth

**Data flow pattern:**
```ts
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { status: number; message: string } }
```

**Auth model:** Credentials (email/password JWT) + Spotify OAuth. `registrationStage` enum gates onboarding (10 stages: STARTED → FINISHED).

**Commands:**
```bash
npm run dev      # localhost:3000
npm run build    # production build (Turbopack)
npm run lint     # ESLint
```
