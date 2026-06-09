'use client';

import { useSession, signOut } from 'next-auth/react';
import { Music, LogOut, User, Settings, Compass, Heart } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useMatchBadge } from '@/app/hooks/useMatchBadge';

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const hasNewMatch = useMatchBadge();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <header
      className="w-full sticky top-0 z-50"
      style={{
        background: 'rgba(27,15,26,.72)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        borderBottom: '1px solid var(--v-border)',
      }}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Gold brand lockup */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div
              className="flex items-center justify-center"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'var(--v-gold-grad-135)',
                boxShadow: 'var(--v-shadow-gold-glow)',
              }}>
              <Music style={{ width: 19, height: 19, color: 'var(--v-ink)' }} strokeWidth={2.25} />
            </div>
            <span className="v-wordmark" style={{ fontSize: 24 }}>
              Harmony
            </span>
          </button>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {process.env.NODE_ENV === 'development' && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="items-center gap-2 hidden md:flex"
                style={{ color: 'var(--nav-text-muted, #94a3b8)' }}
                title="Dev Tools">
                <Link href="/admin/phase1">
                  <Settings className="h-4 w-4" />
                  <span className="hidden md:inline text-xs">Dev</span>
                </Link>
              </Button>
            )}

            {status === 'loading' ? (
              /* Skeleton sized to approximate the 3 nav links + sign-out button */
              <div className="flex items-center gap-1">
                <div className="h-8 w-24 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--nav-bg-hover, #252545)' }} />
                <div className="h-8 w-24 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--nav-bg-hover, #252545)' }} />
                <div className="h-8 w-20 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--nav-bg-hover, #252545)' }} />
              </div>
            ) : session ? (
              <div className="flex items-center gap-1">
                {/* Desktop nav links — use asChild+Link so Next.js can prefetch */}
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hidden md:flex items-center gap-2 italic"
                  style={{
                    color: pathname.startsWith('/discover') ? 'var(--v-gold-light)' : 'var(--v-fg-muted)',
                    background: pathname.startsWith('/discover') ? 'rgba(232,177,92,.08)' : 'transparent',
                    border: pathname.startsWith('/discover') ? '1px solid rgba(232,177,92,.22)' : '1px solid transparent',
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                    borderRadius: 9999,
                  }}>
                  <Link href="/discover">
                    <Compass className="h-4 w-4" />
                    <span className="hidden md:inline">Discover</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hidden md:flex items-center gap-2 italic"
                  style={{
                    color: pathname.startsWith('/matches') ? 'var(--v-gold-light)' : 'var(--v-fg-muted)',
                    background: pathname.startsWith('/matches') ? 'rgba(232,177,92,.08)' : 'transparent',
                    border: pathname.startsWith('/matches') ? '1px solid rgba(232,177,92,.22)' : '1px solid transparent',
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                    borderRadius: 9999,
                  }}>
                  <Link href="/matches">
                    <span className="relative">
                      <Heart className="h-4 w-4" />
                      {hasNewMatch && !pathname.startsWith('/matches') && (
                        <span
                          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                          style={{ background: 'var(--v-gold)' }}
                        />
                      )}
                    </span>
                    <span className="hidden md:inline">Matches</span>
                  </Link>
                </Button>
                {/* Profile: md:flex fixes 768–1023px dead zone (was lg:flex) */}
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hidden md:flex items-center gap-2 italic"
                  style={{
                    color: pathname.startsWith('/profile') ? 'var(--v-gold-light)' : 'var(--v-fg-muted)',
                    background: pathname.startsWith('/profile') ? 'rgba(232,177,92,.08)' : 'transparent',
                    border: pathname.startsWith('/profile') ? '1px solid rgba(232,177,92,.22)' : '1px solid transparent',
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                    borderRadius: 9999,
                  }}>
                  <Link href="/profile">
                    <User className="h-4 w-4" />
                    <span className="hidden md:inline">Profile</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center gap-2 italic"
                  style={{
                    color: 'var(--v-fg-muted)',
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                  }}>
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hover:bg-white/10 italic"
                  style={{
                    color: 'var(--v-fg-muted)',
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                  }}>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="rounded-full v-cta-gold">
                  <Link href="/register">Begin</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
