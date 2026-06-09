'use client';

import { useSession } from 'next-auth/react';
import { Compass, Heart, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useMatchBadge } from '@/app/hooks/useMatchBadge';

const HIDDEN_ON = ['/', '/onboarding', '/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/setup'];

const NAV_ITEMS = [
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/matches',  label: 'Matches',  icon: Heart },
  { href: '/profile',  label: 'Profile',  icon: User },
];

export default function BottomNav() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const hasNewMatch = useMatchBadge();

  // Only show when authenticated
  if (status === 'loading' || !session) return null;

  // Hide on certain routes
  const isHidden = HIDDEN_ON.some((path) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)
  );
  if (isHidden) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden"
      style={{
        background: 'rgba(27,15,26,.82)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        borderTop: '1px solid var(--v-border)',
      }}>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href);
        const showBadge = href === '/matches' && hasNewMatch && !isActive;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors"
            style={{
              color: isActive ? 'var(--nav-active, #a78bfa)' : 'var(--nav-text-muted, #94a3b8)',
            }}>
            <div className="relative">
              <Icon
                className="h-5 w-5"
                fill={isActive ? 'currentColor' : 'none'}
                strokeWidth={isActive ? 0 : 2}
              />
              {showBadge && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                  style={{ background: 'var(--v-gold)' }}
                />
              )}
            </div>
            <span className="text-[10px] font-medium">{label}</span>
            {isActive && (
              <span
                className="absolute bottom-0 w-8 h-0.5 rounded-full"
                style={{ backgroundColor: 'var(--nav-active, #a78bfa)' }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
