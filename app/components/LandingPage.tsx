'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Music, Heart, Users, Headphones } from 'lucide-react';
import type { ComponentType, CSSProperties, ReactNode } from 'react';

import { SpotifyIcon } from '@/components/icons/SpotifyIcon';

const wrap: CSSProperties = {
  maxWidth: 1120,
  margin: '0 auto',
  padding: '0 24px',
  position: 'relative',
  zIndex: 1,
};

type IconProps = { className?: string; style?: CSSProperties };

type ActProps = { numeral: string; title: string; body: string };
function Act({ numeral, title, body }: ActProps) {
  return (
    <div
      className="p-7"
      style={{
        borderRadius: 18,
        background: 'var(--v-row)',
        border: '1px solid var(--v-row-border)',
      }}>
      <div
        className="v-display v-italic v-gold"
        style={{ fontSize: 54, lineHeight: 1, fontWeight: 500, marginBottom: 14 }}>
        {numeral}
      </div>
      <h3 className="v-display m-0 mb-2" style={{ fontSize: 20, fontWeight: 500 }}>
        {title}
      </h3>
      <p className="m-0" style={{ color: 'var(--v-fg-muted)', fontSize: 14, lineHeight: 1.6 }}>
        {body}
      </p>
    </div>
  );
}

type WhyProps = { icon: ComponentType<IconProps>; title: string; body: string };
function WhyCard({ icon: IconCmp, title, body }: WhyProps) {
  return (
    <div
      className="p-7 relative overflow-hidden"
      style={{
        borderRadius: 18,
        background: 'var(--v-card)',
        border: '1px solid var(--v-border)',
      }}>
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: 1,
          background:
            'linear-gradient(90deg, transparent, rgba(232,177,92,.3), transparent)',
        }}
      />
      <div
        className="flex items-center justify-center mb-4"
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: 'rgba(232,177,92,.08)',
          border: '1px solid var(--v-border)',
        }}>
        <IconCmp style={{ width: 20, height: 20, color: 'var(--v-gold)' }} />
      </div>
      <h3 className="v-display m-0 mb-2" style={{ fontSize: 22, fontWeight: 500 }}>
        {title}
      </h3>
      <p className="m-0" style={{ color: 'var(--v-fg-muted)', fontSize: 14.5, lineHeight: 1.6 }}>
        {body}
      </p>
    </div>
  );
}

type StatProps = { value: string; label: string; last?: boolean };
function Stat({ value, label, last }: StatProps) {
  return (
    <div
      className="text-center"
      style={{ borderRight: last ? 'none' : '1px solid var(--v-divider)' }}>
      <div className="v-display v-gold" style={{ fontSize: 38, fontWeight: 500 }}>
        {value}
      </div>
      <div
        className="v-mono"
        style={{ fontSize: 10, color: 'var(--v-fg-faint)', marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

type EyebrowProps = { children: ReactNode; bordered?: boolean; glow?: boolean };
function Eyebrow({ children, bordered, glow }: EyebrowProps) {
  return (
    <span
      className="v-mono"
      style={{
        fontSize: 11,
        color: glow ? 'var(--v-gold)' : bordered ? 'var(--v-gold)' : 'var(--v-fg-faint)',
        letterSpacing: glow ? '.2em' : '.18em',
        ...(bordered
          ? {
              padding: '6px 14px',
              borderRadius: 'var(--v-pill)',
              border: '1px solid var(--v-border-strong)',
              background: 'rgba(232,177,92,.06)',
            }
          : {}),
      }}>
      {children}
    </span>
  );
}

const spotifyBtn: CSSProperties = {
  background: 'var(--v-spotify)',
  color: '#fff',
  fontWeight: 600,
  border: 'none',
  boxShadow:
    '0 8px 20px -6px rgba(29,185,84,.4), inset 0 0 0 1px rgba(255,255,255,.1)',
};

const secondaryBtn: CSSProperties = {
  background: 'transparent',
  color: 'var(--v-gold-light)',
  fontWeight: 500,
  border: '1px solid var(--v-border-strong)',
  fontStyle: 'italic',
  fontFamily: 'var(--font-fraunces), Georgia, serif',
};

const primaryGoldBtn: CSSProperties = {
  background: 'var(--v-gold-grad)',
  color: 'var(--v-ink)',
  fontWeight: 600,
  border: 'none',
  boxShadow: 'var(--v-shadow-cta)',
  letterSpacing: '.01em',
};

const btnBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  borderRadius: 'var(--v-pill)',
  transition: 'transform .15s, box-shadow .15s, filter .15s',
};

const sizeXL: CSSProperties = { padding: '16px 32px', fontSize: 16, height: 58 };
const sizeMD: CSSProperties = { padding: '11px 22px', fontSize: 14, height: 44 };

export default function LandingPage() {
  const onSpotify = () => signIn('spotify', { callbackUrl: '/onboarding' });

  return (
    <div className="relative min-h-screen">
      <div className="v-page-texture" />
      <div className="v-grain" />

      {/* Hero */}
      <section style={{ ...wrap, padding: '96px 24px 48px' }}>
        <div
          className="v-enter flex flex-col items-center text-center"
          style={{ gap: 28, maxWidth: 900, margin: '0 auto' }}>
          <Eyebrow bordered>— an invitation —</Eyebrow>

          <h1
            className="v-display m-0"
            style={{
              fontSize: 'clamp(48px, 7vw, 88px)',
              lineHeight: 1.02,
              color: 'var(--v-fg)',
              fontWeight: 500,
            }}>
            For the <span className="v-italic v-gold">hopeless listeners.</span>
          </h1>

          <p
            className="m-0"
            style={{
              fontSize: 19,
              color: 'var(--v-fg-muted)',
              maxWidth: 620,
              lineHeight: 1.55,
            }}>
            A dating app for people whose Spotify Wrapped says more than their profile ever
            could. Match on the music that actually moves you — then meet.
          </p>

          <div
            className="w-full flex flex-col"
            style={{ maxWidth: 480, gap: 12, marginTop: 8 }}>
            <button
              onClick={onSpotify}
              style={{ ...btnBase, ...sizeXL, ...spotifyBtn, width: '100%' }}>
              <SpotifyIcon className="h-5 w-5" />
              Continue with Spotify
            </button>
            <Link
              href="/register"
              style={{ ...btnBase, ...sizeXL, ...secondaryBtn, width: '100%' }}>
              Begin with email
            </Link>
            <p
              className="v-mono"
              style={{
                fontSize: 10,
                color: 'var(--v-fg-faint)',
                margin: '4px 0 0',
              }}>
              free · no credit card · take your time
            </p>
            <p
              className="m-0"
              style={{
                fontSize: 13,
                color: 'var(--v-fg-muted)',
                marginTop: 4,
              }}>
              Already have an account?{' '}
              <Link
                href="/login"
                style={{
                  color: 'var(--v-gold-light)',
                  fontStyle: 'italic',
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Stat strip */}
        <div
          className="grid"
          style={{
            marginTop: 72,
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderTop: '1px solid var(--v-divider)',
            borderBottom: '1px solid var(--v-divider)',
            padding: '28px 0',
          }}>
          <Stat value="126" label="genres analyzed" />
          <Stat value="83%" label="match correlation" />
          <Stat value="2.4M" label="songs indexed" />
          <Stat value="∞" label="playlists shared" last />
        </div>
      </section>

      {/* Why Harmony */}
      <section style={{ ...wrap, padding: '80px 24px' }}>
        <div className="text-center" style={{ marginBottom: 56 }}>
          <Eyebrow>· why harmony ·</Eyebrow>
          <h2
            className="v-display"
            style={{ fontSize: 44, margin: '14px 0 10px', fontWeight: 500 }}>
            Taste is <span className="v-italic v-gold">intimacy.</span>
          </h2>
          <p
            style={{
              color: 'var(--v-fg-muted)',
              maxWidth: 560,
              margin: '0 auto',
              fontSize: 16,
              lineHeight: 1.6,
            }}>
            Music compatibility is one of the strongest predictors of long-term connection. We
            listen to what you actually listen to.
          </p>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <WhyCard
            icon={Headphones}
            title="Deep listening"
            body="We analyze three years of your listening — artists, genres, decades, time of day. Not just your liked songs."
          />
          <WhyCard
            icon={Heart}
            title="Quiet confidence"
            body="No engagement bait, no swipe streaks. A match appears when the music says something. Then you talk."
          />
          <WhyCard
            icon={Users}
            title="Real rooms"
            body="Find your concert date, your record-store companion, the person who already knows the setlist by heart."
          />
        </div>
      </section>

      {/* How it unfolds */}
      <section style={{ ...wrap, padding: '40px 24px 80px' }}>
        <div className="text-center" style={{ marginBottom: 48 }}>
          <Eyebrow>· three acts ·</Eyebrow>
          <h2
            className="v-display"
            style={{ fontSize: 44, margin: '14px 0 10px', fontWeight: 500 }}>
            How it <span className="v-italic v-gold">unfolds.</span>
          </h2>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <Act
            numeral="I"
            title="Connect your music"
            body="Link Spotify or Apple Music. We read listening, not taste tests — the algorithm trusts your ears over your words."
          />
          <Act
            numeral="II"
            title="Receive your matches"
            body="Each profile arrives with a compatibility score across 126 genres. Know before you swipe."
          />
          <Act
            numeral="III"
            title="Meet for the show"
            body="Start with a shared artist. End with the seat next to you at a concert. No small talk, ever."
          />
        </div>
      </section>

      {/* Finale CTA */}
      <section style={{ ...wrap, padding: '0 24px 96px' }}>
        <div
          className="text-center relative overflow-hidden"
          style={{
            maxWidth: 860,
            margin: '0 auto',
            padding: '64px 48px',
            borderRadius: 22,
            background:
              'radial-gradient(ellipse at top, rgba(232,177,92,.12), transparent 65%), var(--v-card)',
            border: '1px solid var(--v-border-strong)',
          }}>
          <div
            className="absolute"
            style={{
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '70%',
              height: 1,
              background:
                'linear-gradient(90deg, transparent, var(--v-gold), transparent)',
            }}
          />
          <Eyebrow glow>— finale —</Eyebrow>
          <h2
            className="v-display"
            style={{ fontSize: 48, margin: '16px 0 12px', fontWeight: 500, lineHeight: 1.05 }}>
            Ready when <span className="v-italic v-gold">you are.</span>
          </h2>
          <p
            style={{
              fontSize: 16,
              color: 'var(--v-fg-muted)',
              margin: '0 auto 32px',
              maxWidth: 500,
              lineHeight: 1.6,
            }}>
            Connect your music. Meet someone whose Wrapped would finish your sentence.
          </p>
          <button
            onClick={onSpotify}
            style={{ ...btnBase, ...sizeXL, ...primaryGoldBtn }}>
            <Music
              style={{ width: 18, height: 18, color: 'var(--v-ink)' }}
              strokeWidth={2.25}
            />
            Begin with Spotify
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="v-mono text-center"
        style={{
          borderTop: '1px solid var(--v-divider)',
          padding: '28px 24px',
          color: 'var(--v-fg-faint)',
          fontSize: 12,
          letterSpacing: '.12em',
        }}>
        <div
          className="flex flex-col items-center gap-3 md:flex-row md:justify-between"
          style={{ maxWidth: 1120, margin: '0 auto' }}>
          <span>© 2026 Harmony · velour edition</span>
          <div className="flex gap-6">
            <Link href="/privacy" style={{ color: 'inherit' }}>
              Privacy
            </Link>
            <Link href="/terms" style={{ color: 'inherit' }}>
              Terms
            </Link>
            <a href="mailto:contact@harmonyapp.com" style={{ color: 'inherit' }}>
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
