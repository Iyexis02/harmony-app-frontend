# Chat & Messaging Feature — Harmony Dating App

> **Status:** Planned — Implementation scheduled. See sprint breakdown at the bottom.

---

## Context

Users can currently see their mutual matches on `/matches` but the "Message" button is disabled (shows "Soon"). This plan implements the full messaging feature: a conversation list page, an individual chat view, polling-based real-time updates, optimistic message sends, and an unread count badge in the navigation. Messaging is restricted to mutual matches only.

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Polling (not WebSocket) for v1** | No real-time transport exists in the current stack. `useMessaging` encapsulates polling so upgrading to WebSocket later only requires changing that one file. |
| **`matchId` as conversation ID** | Strict 1:1 between match and conversation. First `POST /messages` implicitly creates the conversation — no separate creation step. |
| **Server actions for mutations only** | `sendMessage` and `markConversationRead` go through `app/serverActions/messages.ts`. Polling reads call the backend directly via `NEXT_PUBLIC_API_URL` — same pattern as `useMatching.ts`. |
| **Optimistic UI** | Sent messages appear immediately with `status: 'sending'`, confirmed or rolled back when server responds. |
| **Unread count via React context** | Mounted once in `providers.tsx` so `BottomNav` and `Header` share the same polling instance without double-fetching. |

---

## Backend API Contract

All endpoints under `/api/v1/messages`. All require `Authorization: Bearer {token}`.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/messages/conversations` | List conversations (preview + last message, ordered by recency) |
| `GET` | `/messages/{matchId}?limit=30&before={messageId}` | Paginated messages, newest-first |
| `POST` | `/messages/{matchId}` | Send a message (creates conversation on first send) |
| `PUT` | `/messages/{matchId}/read` | Mark all unread messages in conversation as read |
| `GET` | `/messages/unread-count` | Global unread count for nav badge |

### Response Shapes

**GET /messages/conversations → 200**
```json
{
  "conversations": [
    {
      "matchId": "abc123",
      "otherUserId": "u456",
      "otherUserName": "Lena",
      "otherUserPhoto": "https://res.cloudinary.com/...",
      "matchScore": 87,
      "unreadCount": 2,
      "lastMessage": {
        "content": "Hey! How was the concert?",
        "sentAt": "2026-03-09T14:22:00Z",
        "senderId": "u456",
        "isRead": false
      }
    }
  ],
  "total": 1
}
```

**GET /messages/{matchId} → 200**
```json
{
  "messages": [
    {
      "messageId": "msg_789",
      "matchId": "abc123",
      "senderId": "u123",
      "content": "Looking forward to it!",
      "sentAt": "2026-03-09T14:25:00Z",
      "readAt": null,
      "status": "delivered"
    }
  ],
  "hasMore": true,
  "oldestMessageId": "msg_789"
}
```
> Array is newest-first (index 0 = most recent). Client reverses for display.

**POST /messages/{matchId}**
- Request: `{ "content": "...", "clientTempId": "uuid-v4" }`
- Response `201`: full `MessageDto` with `clientTempId` echoed back
- Response `403`: users are not mutual matches
- Response `404`: matchId not found
- Response `400`: content exceeds 1000 characters

**GET /messages/unread-count → 200**
```json
{ "totalUnread": 5 }
```

---

## TypeScript Types — `types/messages.d.ts` (NEW)

```typescript
export type MessageStatus = 'sending' | 'sent' | 'failed' | 'delivered';

export type MessageDto = {
  messageId: string;
  matchId: string;
  senderId: string;
  content: string;
  sentAt: string;           // ISO 8601
  readAt: string | null;
  status: MessageStatus;
  clientTempId?: string;    // present on optimistic messages and server echo
};

export type MessagePageDto = {
  messages: MessageDto[];
  hasMore: boolean;
  oldestMessageId: string | null;
};

export type SendMessageRequestDto = {
  content: string;
  clientTempId: string;
};

export type ConversationPreviewDto = {
  matchId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto?: string;
  lastMessage: {
    content: string;
    sentAt: string;
    senderId: string;
    isRead: boolean;
  } | null;
  unreadCount: number;
  matchScore: number;
};

export type ConversationListDto = {
  conversations: ConversationPreviewDto[];
  total: number;
};

export type UnreadCountDto = {
  totalUnread: number;
};
```

---

## Complete File Tree

```
types/
└── messages.d.ts                               ← NEW

app/
├── contexts/
│   └── UnreadCountContext.tsx                  ← NEW
├── hooks/
│   ├── useMessaging.ts                         ← NEW
│   └── useUnreadCount.ts                       ← NEW
├── serverActions/
│   └── messages.ts                             ← NEW
├── messages/
│   ├── layout.tsx                              ← NEW (minimal passthrough)
│   ├── page.tsx                                ← NEW (conversation list)
│   └── [matchId]/
│       └── page.tsx                            ← NEW (individual chat view)
└── components/
    └── messages/                               ← NEW directory
        ├── ConversationListItem.tsx
        ├── ConversationListSkeleton.tsx
        ├── ChatHeader.tsx
        ├── MessageBubble.tsx
        ├── MessageComposer.tsx
        ├── MessageFeedSkeleton.tsx
        └── EmptyConversationState.tsx
```

---

## Server Actions — `app/serverActions/messages.ts`

Follows the exact pattern of `app/serverActions/auth.ts` (private `makeRequest` helper + named exports).

```typescript
'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { MessageDto, SendMessageRequestDto } from '@/types/messages';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { status: number; message: string } };

const BACKEND = process.env.BACKEND_API_URL || 'http://localhost:8080';

async function makeRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT',
  body?: unknown
): Promise<ApiResult<T>> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { ok: false, error: { status: 401, message: 'Not authenticated' } };
  }
  try {
    const response = await fetch(`${BACKEND}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => null);
    if (response.ok) return { ok: true, data: data as T };
    return {
      ok: false,
      error: { status: response.status, message: data?.message || response.statusText || 'Error' },
    };
  } catch (err: any) {
    return { ok: false, error: { status: 500, message: err?.message || 'Network error' } };
  }
}

export async function sendMessage(
  matchId: string,
  payload: SendMessageRequestDto
): Promise<ApiResult<MessageDto>> {
  return makeRequest<MessageDto>(`/api/v1/messages/${matchId}`, 'POST', payload);
}

export async function markConversationRead(
  matchId: string
): Promise<ApiResult<{ markedCount: number }>> {
  return makeRequest<{ markedCount: number }>(`/api/v1/messages/${matchId}/read`, 'PUT');
}
```

---

## Hook Design

### `app/hooks/useUnreadCount.ts`

- Polls `GET /messages/unread-count` every **30 seconds**
- Exposes: `{ unreadCount, decrementBy(n), resetToZero, refetch }`
- Never instantiated directly in components — always consumed via `UnreadCountContext`

### `app/contexts/UnreadCountContext.tsx`

```typescript
'use client';
import { createContext, useContext, ReactNode } from 'react';
import { useUnreadCount } from '@/app/hooks/useUnreadCount';

type UnreadCountContextValue = ReturnType<typeof useUnreadCount>;
const UnreadCountContext = createContext<UnreadCountContextValue | null>(null);

export function UnreadCountProvider({ children }: { children: ReactNode }) {
  const value = useUnreadCount();
  return <UnreadCountContext.Provider value={value}>{children}</UnreadCountContext.Provider>;
}

export function useUnreadCountContext() {
  const ctx = useContext(UnreadCountContext);
  if (!ctx) throw new Error('useUnreadCountContext must be used inside UnreadCountProvider');
  return ctx;
}
```

Mounted once in `providers.tsx` (see Existing File Changes).

### `app/hooks/useMessaging(matchId)`

Polls `GET /messages/{matchId}` every **3 seconds** while the chat page is mounted.

**State:**
```typescript
{
  messages: MessageDto[];        // newest-first (internal order)
  displayMessages: MessageDto[]; // reversed for render (newest at bottom)
  loading: boolean;              // initial load
  loadingMore: boolean;          // paginating upward
  hasMore: boolean;
  sending: boolean;
  error: string | null;
  oldestMessageId: string | null;
}
```

**Methods:** `sendMessage(content)`, `loadMoreMessages()`, `retryFailedMessage(clientTempId)`

**Key behaviors:**
- **Optimistic send:** Insert `{ status: 'sending', clientTempId: uuid() }` at front immediately. Replace with confirmed `MessageDto` on server success. Set `status: 'failed'` on error + show Sonner toast.
- **Poll merge logic:** After each poll, preserve any `'sending'`/`'failed'` optimistic messages not yet reconciled by matching `clientTempId`.
- **Pagination:** `loadMoreMessages()` calls `?before={oldestMessageId}`, appends older messages to end of newest-first array. Captures `scrollHeight` before fetch and restores `scrollTop` after to prevent jump.
- **Mark read:** Called on initial load and each poll tick that delivers new messages. Guarded by a ref — only fires if last known `unreadCount > 0`.
- **Pause on hidden tab:** `visibilitychange` listener stops poll timer when `document.hidden === true`, resumes on visibility restored.
- **WebSocket upgrade path:** Only the polling `useEffect` block needs replacing. All components remain unchanged.

---

## Component Inventory

### `ConversationListItem`
```typescript
type Props = { conversation: ConversationPreviewDto };
```
Renders: avatar (with Music fallback), name (bold if unread), last message preview (1 line truncated), time-ago (`formatDistanceToNow`), unread count badge (pink `--accent` circle, hidden when 0).

### `ConversationListSkeleton`
```typescript
type Props = { count?: number }; // default 4
```
Skeleton rows matching `ConversationListItem` layout. Uses `<Skeleton>` from `components/ui/skeleton`.

### `ChatHeader`
```typescript
type Props = { otherUserName: string; otherUserPhoto?: string; matchScore: number; onBack: () => void };
```
Back arrow, avatar, name, match score badge (reuses `getScoreColorClass` from `lib/profileHelpers.ts`).

### `MessageBubble`
```typescript
type Props = { message: MessageDto; isSelf: boolean; onRetry?: () => void };
```
- Self (right): `bg-primary text-white rounded-br-sm`
- Other (left): `bg-muted text-foreground rounded-bl-sm`
- Timestamp below bubble (`HH:mm`)
- `status: 'sending'` → dimmed opacity + pulse animation
- `status: 'failed'` → red tint, entire bubble is a button calling `onRetry`
- Framer Motion: `initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}`

### `MessageComposer`
```typescript
type Props = { onSend: (content: string) => void; disabled?: boolean; placeholder?: string };
```
Auto-growing `<textarea>` (up to 4 lines). Enter = send, Shift+Enter = newline. Character counter shown at 900+ (limit 1000). Send button with `Loader2` spinner when `disabled`.

### `MessageFeedSkeleton`
```typescript
type Props = { count?: number }; // default 6
```
Alternating left/right skeleton bubbles to mimic a real conversation during initial load.

### `EmptyConversationState`
```typescript
type Props = { otherUserName: string; matchScore: number };
```
Shown when `messages.length === 0`. Music icon with Framer Motion scale-in. "Start a conversation with {name}!" + score callout. No button needed — the composer is below.

---

## Page Implementations

### `app/messages/page.tsx` — Conversation List

- Auth guard: redirect to `/` if not authenticated (same pattern as `app/matches/page.tsx`)
- Fetches `GET /conversations` on mount
- Loading: `<ConversationListSkeleton count={4} />`
- Empty: "No conversations yet" + Button to `/matches`
- List: `<motion.div>` with `staggerChildren: 0.05` (reuse `containerVariants` from matches page)
- Each row: `<Link href="/messages/${matchId}"><ConversationListItem /></Link>`

### `app/messages/[matchId]/page.tsx` — Chat View

**Layout (flex column, full viewport minus chrome):**
```
┌─────────────────────────────┐
│  ChatHeader   (sticky top)  │
├─────────────────────────────┤
│                             │
│  [Load Earlier] (if hasMore)│
│                             │
│  MessageBubble...           │
│  MessageBubble...           │
│           MessageBubble...  │  ← newest at bottom
├─────────────────────────────┤
│  MessageComposer (sticky)   │
└─────────────────────────────┘
```

**Scroll behaviors:**
- On load: scroll to bottom
- Poll delivers new messages: scroll to bottom **only if** user is within 100px of bottom. Otherwise show a "↓ New message" nudge button pinned above composer.
- On send: always scroll to bottom
- Load more: save `scrollHeight` before fetch, restore `scrollTop = newScrollHeight - savedScrollHeight` after

**Match metadata:** Passed as URL search params (`?name=Lena&photo=...&score=87`) from the matches page — avoids needing a new `GET /matches/{matchId}` backend endpoint for v1.

---

## Existing Files to Modify

| File | Change |
|------|--------|
| `providers.tsx` | Add `<UnreadCountProvider>` wrapping `SessionProvider` children |
| `app/components/BottomNav.tsx` | Add `{ href: '/messages', label: 'Messages', icon: MessageCircle }` to nav items. Add unread badge overlay (pink dot with count) using `useUnreadCountContext()`. |
| `app/components/Header.tsx` | Add Messages desktop link with unread badge between Matches and Stats. |
| `app/matches/page.tsx` | Replace disabled Message button with `router.push('/messages/${match.matchId}?name=...')`. Label: `match.conversationStarted ? 'Continue Chat' : 'Message'`. |
| `app/matches/components/MatchNotification.tsx` | Add "Send a Message" button that closes the notification and navigates to `/messages/${match.matchId}`. |

---

## Implementation Sprints

### Sprint 1 — Contract + Types
- [ ] `types/messages.d.ts`
- [ ] `app/serverActions/messages.ts` (stub implementations)
- [ ] `app/contexts/UnreadCountContext.tsx` (hardcoded `unreadCount: 0`)
- [ ] Add `<UnreadCountProvider>` to `providers.tsx`

### Sprint 2 — Navigation Integration
- [ ] `BottomNav.tsx` — Messages nav item + badge wiring
- [ ] `Header.tsx` — Messages desktop link + badge wiring
- [ ] `app/matches/page.tsx` — Enable Message button with navigation
- [ ] Placeholder route files at `/messages` and `/messages/[matchId]`

### Sprint 3 — UI Components
- [ ] `MessageBubble.tsx`
- [ ] `MessageComposer.tsx`
- [ ] `ChatHeader.tsx`
- [ ] `EmptyConversationState.tsx`
- [ ] `ConversationListItem.tsx`
- [ ] `ConversationListSkeleton.tsx`
- [ ] `MessageFeedSkeleton.tsx`

### Sprint 4 — Chat View
- [ ] `app/hooks/useMessaging.ts` (polling, optimistic send, pagination, mark read)
- [ ] `app/messages/[matchId]/page.tsx` (full implementation with all scroll behaviors)

### Sprint 5 — Conversation List + Real Unread
- [ ] `app/hooks/useUnreadCount.ts` (real 30s polling)
- [ ] Wire `UnreadCountContext` to real hook (replace stub)
- [ ] `app/messages/page.tsx`
- [ ] `MatchNotification.tsx` — Send a Message button

### Sprint 6 — Polish
- [ ] Handle 403 on send (unmatch during conversation) — stop polling + toast
- [ ] Pause polling on hidden tab (`visibilitychange`)
- [ ] Mobile keyboard/safe-area testing (iOS Safari)
- [ ] `npm run lint` clean pass
- [ ] Remove any temporary test pages

---

## Edge Cases

| Scenario | Handling |
|----------|---------|
| Unmatch while chat open | Next `POST` returns 403 → toast "This conversation is no longer available", stop polling |
| Poll fires before send confirms | Merge logic preserves `'sending'` optimistic message (matched by `clientTempId`) |
| Empty conversation (first open) | `EmptyConversationState` shown; first send auto-creates conversation |
| Virtual keyboard on mobile | Composer uses `position: sticky; bottom: 0`; test `env(safe-area-inset-bottom)` padding on iOS |
| Token expiry during poll | 401 caught silently; NextAuth refreshes token; next tick uses fresh token |
| 100+ match conversations | Conversation list is server-paginated (backend handles); client shows first page |

---

## Verification Checklist

- [ ] `/matches` → click "Message" on a match → navigates to `/messages/[matchId]`
- [ ] First message send → appears immediately (optimistic), confirmed from server on next poll
- [ ] Network error on send → bubble shows red "Failed · Tap to retry", retry works
- [ ] Scroll up → "Load Earlier" button → older messages load, scroll position preserved
- [ ] New message arrives via poll while scrolled up → "↓ New message" nudge appears
- [ ] Open a conversation → nav unread badge count decrements
- [ ] MatchNotification "Send a Message" → navigates to correct chat
- [ ] Conversation list ordered by most recent message
- [ ] Mobile 375px: composer stays visible when keyboard opens
- [ ] Switch to another tab while chat open → poll pauses; return → poll resumes

---

## Key Reference Files (for implementation)

| File | Why relevant |
|------|-------------|
| `app/hooks/useMatching.ts` | Copy polling pattern + token access into `useMessaging` |
| `app/serverActions/auth.ts` | Copy `makeRequest` helper pattern into `messages.ts` |
| `app/matches/page.tsx` | Copy skeleton, animation variants, auth guard patterns |
| `providers.tsx` | Mount `UnreadCountProvider` here |
| `lib/profileHelpers.ts` | Reuse `getScoreColorClass()` in `ChatHeader` |
| `app/components/BottomNav.tsx` | Add Messages nav item here |
| `types/phase3.d.ts` | `MatchListItemDto.conversationStarted` + `matchId` fields |
