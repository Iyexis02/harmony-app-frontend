# Backend briefing — email-verification gate blocks genre persistence & breaks discovery

**From:** frontend (Next.js) side, after an end-to-end Playwright run of the full
email/password onboarding on 2026-06-07.
**Audience:** the backend Claude agent working on the Spring Boot API.
**Status:** frontend has shipped a partial mitigation (legible error messages); the core data
issue and the response-shape issue need backend decisions.

---

## 1. What we observed (reproducible)

A user who registers with **email/password and does NOT verify their email** can still walk
through all 8 onboarding steps and reach `registrationStage = FINISHED` (confirmed persisted:
`GET /api/v1/onboarding/profile` returns `FINISHED`, `completionPercentage: 100`).

But on the Music step, saving favorite genres **fails**:

```
POST /api/v1/preferences/genres   { "genreName": "rock",      "weight": 0.8 }  → 403
POST /api/v1/preferences/genres   { "genreName": "indie pop", "weight": 0.8 }  → 403
POST /api/v1/preferences/genres   { "genreName": "house",     "weight": 0.8 }  → 403
```

Verified directly with the live bearer token (user already `FINISHED`):

| Request | Result |
|---|---|
| `GET /api/v1/onboarding/profile` | 200 — `registrationStage: FINISHED` |
| `GET /api/v1/preferences/genres?limit=20` | **403** `{"error":"Email verification required"}` |
| `POST /api/v1/preferences/genres` | **403** `{"error":"Email verification required"}` |
| `GET /api/v1/matching/potential?...` | **403** `{"error":"Email verification required"}` |

So the gate is **email verification**, and it applies even after onboarding is FINISHED.

### Consequence
- `/onboarding/*` endpoints are **exempt** from the email-verification filter, so the music
  *preferences object* (`musicPreferences.favoriteGenres`) persists via
  `PUT /onboarding/music-preferences`. But the **weighted `GenrePreference` records** that the
  matching engine scores against are created by separate `POST /preferences/genres` calls —
  which the filter **blocks**. Result: the genre list *looks* saved on the profile, but the
  matcher has nothing to score. Silent data gap on the app's central feature.
- `/discover` is dead for these users: `GET /matching/potential` 403s.

---

## 2. Two backend problems

### Problem A — the gate's policy (product decision needed)
`/onboarding/*` is exempt but `/preferences/genres` is not, yet genre creation is *part of
onboarding*. Pick one:

1. **Exempt `POST/GET/DELETE /preferences/genres` from the email-verification filter** (treat
   it like the other onboarding writes). Smallest change; lets onboarding complete fully
   pre-verification, consistent with the fact that the rest of onboarding already is.
2. **Persist the weighted genre records inside the `PUT /onboarding/music-preferences`
   handler** (server-side), so the client no longer fans out N gated POSTs during onboarding.
   Cleaner; removes the client-side N-call partial-failure path entirely.
3. **Gate onboarding itself on email verification** (require verify before onboarding). Biggest
   UX change; would make every downstream write succeed but blocks the current flow.

Frontend recommendation: **option 2** (or 1 as a quick unblock). Whatever you choose, tell us
so we can adjust the client (e.g. drop the per-genre POST loop if you move to option 2).

### Problem B — inconsistent error response shape (please fix regardless)
The `EmailVerificationFilter` is a **pre-MVC servlet filter**, so it bypasses your
`ControllerAdvice` and returns an **ad-hoc body**:

```json
{ "error": "Email verification required" }
```

Every other error in the API uses the standardized shape:

```json
{ "code": "...", "message": "...", "fields": {...}, "timestamp": "..." }
```

Because the field is `error` (not `message`, and there's no `code`), the frontend originally
showed every gated 403 as **"Unknown error"** with only a correlation id — this is the source
of the long-standing "permanent correlation id errors" complaint.

**Ask:** make the filter emit the standard error shape, ideally with a dedicated code:

```json
{
  "code": "EMAIL_VERIFICATION_REQUIRED",
  "message": "Email verification required",
  "timestamp": "2026-06-07T17:00:00Z"
}
```

A stable `code` lets the client switch on it reliably instead of matching message substrings.
Also consider whether **403** is the right status, or whether a more specific signal (e.g. a
`403` with this code, which we can special-case) is preferred. If you add the `code`, tell us
the exact string so we can match on it directly.

---

## 3. What the frontend already did (so we don't duplicate)

- `lib/api.ts` `parseResponse` now falls back `err?.message ?? err?.error`, so the filter's
  `{error: ...}` body is read correctly. Gated 403s now surface as
  `code: EMAIL_VERIFICATION_REQUIRED, message: "Email verification required"` and route through
  `isEmailVerificationError()` instead of degrading to "Unknown error". (Verified live.)
- This is a **read/detection** fix only. It does **not** persist genres or unblock discovery —
  those require Problem A.
- If you implement Problem B (standard `{code, message}` shape), our existing detection keeps
  working unchanged (we already check `message` first, then `error`; and we already map a 403
  whose message contains "Email verification" to the synthetic code). Adding a real
  `EMAIL_VERIFICATION_REQUIRED` code would let us drop the message-substring heuristic — a nice
  follow-up but not required for correctness.

---

## 4. Quick repro for the backend

1. Register a user via email/password; do **not** verify the email.
2. With that user's JWT: `POST /api/v1/preferences/genres` `{ "genreName": "rock", "weight": 0.8 }`.
3. Observe `403 {"error":"Email verification required"}` even though
   `GET /api/v1/onboarding/profile` reports `registrationStage: FINISHED`.

Full frontend-side analysis (per-step save table, server logs, exact JSON) is in
`ONBOARDING_SAVE_DIAGNOSIS.md` in the frontend repo.
