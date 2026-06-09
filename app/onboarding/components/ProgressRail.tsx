'use client';

import { Check } from 'lucide-react';

const ACTS = [
  { roman: 'I', label: 'Basics', sub: 'Name & identity' },
  { roman: 'II', label: 'Whereabouts', sub: 'Where you stand' },
  { roman: 'III', label: 'Portraits', sub: 'Show us your face' },
  { roman: 'IV', label: 'Listening', sub: 'Your soundtrack' },
  { roman: 'V', label: 'Everyday', sub: 'The days you keep' },
  { roman: 'VI', label: 'Interior', sub: 'In your own words' },
  { roman: 'VII', label: 'Wanted', sub: 'Who beside you' },
  { roman: 'VIII', label: 'Curtain', sub: 'How visible' },
] as const;

type Props = {
  currentStep: number;
  totalSteps: number;
  completionPercentage?: number;
  onJump?: (index: number) => void;
};

export default function ProgressRail({
  currentStep,
  totalSteps,
  completionPercentage,
  onJump,
}: Props) {
  const pct = completionPercentage ?? ((currentStep + 1) / totalSteps) * 100;

  return (
    <aside
      className="hidden lg:flex flex-col"
      style={{
        width: 300,
        flexShrink: 0,
        padding: '48px 32px 48px 40px',
        borderRight: '1px solid var(--v-divider)',
        background:
          'linear-gradient(180deg, rgba(37,22,31,.55) 0%, rgba(27,15,26,.35) 100%)',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        alignSelf: 'flex-start',
      }}>
      {/* Masthead */}
      <div style={{ marginBottom: 28 }}>
        <span
          className="v-mono"
          style={{ fontSize: 10, color: 'var(--v-gold)', letterSpacing: '.22em' }}>
          — the playbill —
        </span>
        <h2
          className="v-display"
          style={{ margin: '10px 0 4px', fontSize: 26, fontWeight: 500, lineHeight: 1.1 }}>
          Becoming <span className="v-italic v-gold">you.</span>
        </h2>
        <p style={{ margin: 0, color: 'var(--v-fg-muted)', fontSize: 13, lineHeight: 1.55 }}>
          Eight short acts. Your profile, as an evening program.
        </p>
      </div>

      {/* Progress card */}
      <div
        style={{
          padding: '14px 16px',
          marginBottom: 22,
          borderRadius: 14,
          background: 'rgba(11,5,10,.35)',
          border: '1px solid var(--v-border)',
        }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}>
          <span
            className="v-mono"
            style={{ fontSize: 10, color: 'var(--v-fg-faint)' }}>
            progress
          </span>
          <span
            className="v-display v-italic v-gold"
            style={{ fontSize: 22, fontWeight: 500, lineHeight: 1 }}>
            {Math.round(pct)}%
          </span>
        </div>
        <div
          style={{
            height: 3,
            background: 'rgba(232,177,92,.12)',
            borderRadius: 999,
            overflow: 'hidden',
          }}>
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background:
                'linear-gradient(90deg, var(--v-gold-deep), var(--v-gold-light))',
              boxShadow: '0 0 8px rgba(232,177,92,.55)',
              transition: 'width .35s ease-out',
            }}
          />
        </div>
      </div>

      {/* Acts list */}
      <ol
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          flex: 1,
        }}>
        {ACTS.slice(0, totalSteps).map((act, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          const reachable = i <= currentStep;

          return (
            <li key={act.roman}>
              <button
                type="button"
                onClick={() => reachable && onJump?.(i)}
                disabled={!reachable}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 14,
                  background: active ? 'rgba(232,177,92,.08)' : 'transparent',
                  border:
                    '1px solid ' +
                    (active ? 'rgba(232,177,92,.22)' : 'transparent'),
                  color: 'var(--v-fg)',
                  textAlign: 'left',
                  cursor: reachable ? 'pointer' : 'default',
                  transition: 'all .15s',
                }}>
                {/* Roman numeral */}
                <span
                  className="v-display v-italic"
                  style={{
                    width: 28,
                    textAlign: 'right',
                    fontSize: 18,
                    fontWeight: 500,
                    color: active
                      ? 'var(--v-gold-light)'
                      : done
                        ? 'var(--v-gold-deep)'
                        : 'var(--v-fg-faint)',
                    flexShrink: 0,
                  }}>
                  {act.roman}
                </span>

                {/* Bullet indicator */}
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: done
                      ? 'var(--v-gold)'
                      : active
                        ? 'var(--v-gold-light)'
                        : 'rgba(232,177,92,.2)',
                    boxShadow: active ? '0 0 10px rgba(245,215,154,.7)' : 'none',
                    flexShrink: 0,
                  }}
                />

                <span
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                    flex: 1,
                  }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: active ? 600 : 500,
                      color: active ? 'var(--v-fg)' : 'var(--v-fg-muted)',
                      letterSpacing: '.005em',
                    }}>
                    {act.label}
                  </span>
                  <span
                    className="v-display v-italic"
                    style={{ fontSize: 11.5, color: 'var(--v-fg-faint)' }}>
                    {act.sub}
                  </span>
                </span>

                {done && (
                  <Check
                    style={{
                      width: 14,
                      height: 14,
                      color: 'var(--v-gold)',
                      flexShrink: 0,
                    }}
                    strokeWidth={2.5}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <div
        style={{
          marginTop: 20,
          paddingTop: 18,
          borderTop: '1px solid var(--v-divider)',
        }}>
        <p
          className="v-display v-italic"
          style={{
            margin: 0,
            fontSize: 13,
            color: 'var(--v-fg-faint)',
            lineHeight: 1.5,
          }}>
          &ldquo;No small talk, ever. Start with the music — the rest follows.&rdquo;
        </p>
      </div>
    </aside>
  );
}
