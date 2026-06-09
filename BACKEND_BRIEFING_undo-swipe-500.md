# Backend briefing — Undo-swipe endpoint returns 500 (and isn't in the spec)

**From:** frontend (Next.js) side, found during a Playwright stability sweep on 2026-06-07.
**Audience:** the backend Claude agent working on the Spring Boot API.
**Priority:** Medium. Not blocking — the frontend degrades gracefully — but the Undo feature is
non-functional until this endpoint exists/works.

---

## 1. What happens

On `/discover`, the "Undo last swipe" control calls:

```
DELETE /api/v1/matching/swipe/{swipedUserId}
```

The backend responds **500**:

```
HTTP 500
{
  "code": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "fields": null,
  "timestamp": "..."
}
```

Reproduced live (verified user, after a like): `DELETE /api/v1/matching/swipe/ffb995b9-d9a5-462c-bc2b-b5acc5eab235`
→ 500, correlationId `62248dad-599d-4bf9-9386-2f5f54973dcb`.

## 2. Root issue

This endpoint is **not in the Swagger/OpenAPI spec** — the frontend added the call ahead of a
backend contract. The frontend code even flags it (useMatching.ts, `undoSwipe`):

```ts
// NOTE: DELETE /api/v1/matching/swipe/{userId} is NOT in the swagger spec.
// This endpoint must be agreed with the backend team before shipping this feature.
const result = await authenticatedApiRequest(`/api/v1/matching/swipe/${userId}`, token, { method: 'DELETE' });
```

So the 500 is most likely "no handler / unmapped path falling through to a generic error", or a
half-implemented handler that throws. Either way the client gets `INTERNAL_ERROR`.

## 3. What the frontend already does (so you don't need to coordinate UI changes)

`undoSwipe` is defensive and handles the failure cleanly:
- Optimistically decrements the card index, then **rolls it back** on failure (the card stays
  put — no state corruption).
- Shows a toast based on status: `404` → "Undo is not available yet", `429` → rate-limit
  message, anything else (incl. 500) → "Could not undo swipe".
- Logs `swipe:undo` with the error + `targetUserId`.

So whatever you return, the client won't break. The status code just changes which toast shows.

## 4. What we'd like from the backend

Pick one, and tell us which so we can align the UI:

1. **Implement the endpoint** (preferred if Undo is a desired feature): `DELETE
   /api/v1/matching/swipe/{swipedUserId}` removes the most recent swipe row for
   (currentUser → swipedUserId), so the candidate can resurface. Return **200** on success, and
   the standard error envelope `{code, message, ...}` for failure cases:
   - `404 NOT_FOUND` if there's no swipe to undo,
   - `403`/`409` as appropriate (e.g. can't undo after a mutual match formed),
   - `429` if you want to rate-limit undos.
   Add it to the OpenAPI spec and note the exact request/response shape.

2. **Explicitly "not supported yet":** return **404** (or **501**) with the standard envelope
   instead of 500. The frontend already maps 404 → "Undo is not available yet", which is the
   correct UX for "feature not live". This is the smallest change and stops the scary 500s.

If you choose (2), we'll likely **hide the Undo button** on the frontend until the endpoint is
real — let us know and we'll gate it.

## 5. Quick repro

1. Log in as a verified user with candidates available.
2. `/discover` → Like one card (`POST /api/v1/matching/swipe` with `action: "like"`).
3. Click "Undo last swipe" → `DELETE /api/v1/matching/swipe/{thatUserId}` → observe **500**.

## 6. Context

This came out of a broader frontend stability pass (see `STABILITY_SWEEP.md` in the frontend
repo, finding **F3**). Everything else swept clean; this is the only backend-side item. The
prior email-verification/genre-persistence handoff is already done on your end and verified on
ours.
