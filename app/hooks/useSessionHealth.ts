'use client';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { toast } from 'sonner';

/** Warn when fewer than 30 minutes remain. */
const WARNING_MS = 30 * 60 * 1000;

/** Re-check every 60 seconds. */
const INTERVAL_MS = 60 * 1000;

/**
 * Monitors the backend JWT expiry for email/password users.
 * - Shows a persistent warning toast when < 30 minutes remain.
 * - Calls signOut() gracefully when the JWT has expired.
 * - Re-checks every 60 seconds and on every tab focus (visibilitychange).
 *
 * Spotify users are excluded — their tokens are refreshed automatically.
 * Mount this hook once in the root layout via SessionHealthMonitor (providers.tsx).
 */
export function useSessionHealth(): void {
  const { data: session } = useSession();

  useEffect(() => {
    // Only applies to email/password users.
    if (session?.authProvider !== 'EMAIL') return;

    const expires = session.appJwtExpires;
    if (!expires) return;

    function check(): void {
      const remaining = expires! - Date.now();

      if (remaining <= 0) {
        toast.error('Your session has expired. Please sign in again.', {
          id: 'session-expired',
        });
        signOut({ callbackUrl: '/login' });
        return;
      }

      if (remaining <= WARNING_MS) {
        toast.warning('Your session expires soon. Please sign in again to continue.', {
          id: 'session-expiry-warning',
          duration: Infinity,
        });
      }
    }

    // Run immediately, then on interval and tab focus.
    check();
    const interval = setInterval(check, INTERVAL_MS);

    function onVisibilityChange(): void {
      if (!document.hidden) check();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [session]);
}
