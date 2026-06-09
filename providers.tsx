// app/providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/sonner';
import { NotificationsProvider } from '@/app/hooks/useNotifications';
import { useSessionHealth } from '@/app/hooks/useSessionHealth';

/** Mounts the session health monitor globally inside the SessionProvider. */
function SessionHealthMonitor() {
  useSessionHealth();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionHealthMonitor />
      <NotificationsProvider>
        {children}
      </NotificationsProvider>
      <Toaster richColors position="top-center" />
    </SessionProvider>
  );
}
