'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { authenticatedApiRequest } from '@/lib/api';
import { logError } from '@/lib/logger';
import { RegistrationStage } from '@/app/enums/user/userEnum';

type NotificationsContextValue = {
  hasNewMatch: boolean;
  signalNewMatch: () => void;
  markMatchesSeen: (currentCount: number) => void;
};

const NotificationsContext = createContext<NotificationsContextValue>({
  hasNewMatch: false,
  signalNewMatch: () => {},
  markMatchesSeen: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const accessToken = (session as any)?.accessToken as string | undefined;
  const userId = session?.user?.id;
  // Matching endpoints are protected by the backend's EmailVerificationFilter and
  // only return data once onboarding is complete. Polling before then yields a 403
  // on every request, spamming the console with correlation-id errors. Gate on both.
  const canPollMatches =
    session?.emailVerified === true &&
    session?.registrationStage === RegistrationStage.FINISHED;

  // Cannot safely read a scoped key until userId is known — bootstrapped via useEffect below
  const [hasNewMatch, setHasNewMatch] = useState<boolean>(false);

  // Prevents the poll from running concurrently
  const fetchingRef = useRef(false);

  // Bootstrap from localStorage once userId is known
  useEffect(() => {
    if (!userId) return;
    if (localStorage.getItem(`hasNewMatch:${userId}`) === 'true') {
      setHasNewMatch(true);
    }
  }, [userId]);

  // Dual-write: sets React state AND localStorage so cross-tab StorageEvent fires
  const signalNewMatch = useCallback(() => {
    if (!userId) return;
    setHasNewMatch(true);
    localStorage.setItem(`hasNewMatch:${userId}`, 'true');
  }, [userId]);

  // Takes the current count so it can persist matchesSeenCount for cross-device comparison
  const markMatchesSeen = useCallback((currentCount: number) => {
    if (!userId) return;
    setHasNewMatch(false);
    localStorage.removeItem(`hasNewMatch:${userId}`);
    localStorage.setItem(`matchesSeenCount:${userId}`, currentCount.toString());
  }, [userId]);

  // Cross-tab sync: StorageEvent only fires in OTHER tabs, not the one that wrote
  useEffect(() => {
    if (!userId) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === `hasNewMatch:${userId}`) {
        setHasNewMatch(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId]);

  // Cross-device: poll API on mount, on tab visibility restore, and on a 60s interval.
  // Poll can only SET badge true — never clears it (only markMatchesSeen does that).
  // This prevents a race where a stale poll overwrites a local signalNewMatch().
  useEffect(() => {
    if (status !== 'authenticated' || !accessToken || !canPollMatches) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const check = async () => {
      if (document.hidden || fetchingRef.current) return;
      if (localStorage.getItem('accountDeleted') === 'true') return;
      fetchingRef.current = true;
      try {
        // TODO: backend has no count-only endpoint; using a high cap is a workaround.
        // Replace with a dedicated count endpoint (e.g. /matching/matches/count) when available.
        const result = await authenticatedApiRequest<{ matches: unknown[]; hasMore: boolean }>(
          '/api/v1/matching/matches?status=active&limit=500',
          accessToken,
        );
        if (!result.ok) return;
        const count = result.data.matches?.length ?? 0;
        const seen = parseInt(localStorage.getItem(`matchesSeenCount:${userId}`) ?? '0', 10);
        if (count > seen && userId) {
          setHasNewMatch(true);
          localStorage.setItem(`hasNewMatch:${userId}`, 'true');
        }
      } catch (error) {
        logError('notification:poll', error, { userId });
      } finally {
        fetchingRef.current = false;
      }
    };

    const startPolling = () => {
      if (intervalId !== null) return;
      intervalId = setInterval(check, 60_000);
    };

    const stopPolling = () => {
      if (intervalId === null) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        check();
        startPolling();
      }
    };

    check();
    if (!document.hidden) startPolling();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [status, accessToken, userId, canPollMatches]);

  return (
    <NotificationsContext.Provider value={{ hasNewMatch, signalNewMatch, markMatchesSeen }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  return useContext(NotificationsContext);
}

// Backward-compatible re-export so existing useMatchBadge consumers keep working
export function useMatchBadgeFromContext(): boolean {
  return useNotifications().hasNewMatch;
}
