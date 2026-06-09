'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

const BOTTOM_NAV_HIDDEN_ON = [
  '/',
  '/onboarding',
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/setup',
];

export function AppMain({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const bottomNavVisible =
    !!session &&
    !BOTTOM_NAV_HIDDEN_ON.some((path) =>
      path === '/' ? pathname === '/' : pathname.startsWith(path)
    );

  return (
    <main className={`min-h-screen${bottomNavVisible ? ' pb-16 md:pb-0' : ''}`}>
      {children}
    </main>
  );
}
