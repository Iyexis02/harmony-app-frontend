import { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Roman-numeral act number, e.g. "I", "II" */
  roman?: string;
  /** Mono eyebrow caption above title, e.g. "act one · the overture" */
  eyebrow?: string;
  /** Italic gold accent appended to the title */
  accent?: string;
};

export default function SectionHeader({
  icon: Icon,
  title,
  description,
  roman,
  eyebrow,
  accent,
}: Props) {
  return (
    <div className="v-enter mb-9">
      {/* Roman + eyebrow row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
          marginBottom: 12,
        }}>
        {roman && (
          <span
            className="v-display v-italic v-gold"
            style={{ fontSize: 44, lineHeight: 0.9, fontWeight: 500 }}>
            {roman}
          </span>
        )}
        {eyebrow && (
          <span
            className="v-mono"
            style={{
              fontSize: 10,
              color: 'var(--v-fg-faint)',
              letterSpacing: '.2em',
            }}>
            — {eyebrow} —
          </span>
        )}
      </div>

      {/* Title row — icon tile + serif title with italic gold accent */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: description ? 14 : 0,
        }}>
        <div
          aria-hidden
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'var(--v-gold-grad-135)',
            boxShadow: 'var(--v-shadow-gold-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
          <Icon
            style={{ width: 22, height: 22, color: 'var(--v-ink)' }}
            strokeWidth={2.25}
          />
        </div>
        <h2
          className="v-display"
          style={{
            margin: 0,
            fontSize: 'clamp(28px, 4vw, 38px)',
            fontWeight: 500,
            color: 'var(--v-fg)',
            lineHeight: 1.05,
            letterSpacing: '-.01em',
          }}>
          {title}
          {accent && (
            <>
              {' '}
              <span className="v-italic v-gold">{accent}</span>
            </>
          )}
        </h2>
      </div>

      {description && (
        <p
          style={{
            margin: 0,
            color: 'var(--v-fg-muted)',
            fontSize: 15.5,
            lineHeight: 1.6,
            maxWidth: 560,
          }}>
          {description}
        </p>
      )}
    </div>
  );
}
