interface BadgeListProps {
  items: string[];
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  className?: string;
}

const basePill: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '5px 12px',
  borderRadius: 9999,
  fontSize: 12,
  fontWeight: 500,
  whiteSpace: 'nowrap',
  letterSpacing: '.01em',
};

const velourVariants: Record<string, React.CSSProperties> = {
  default: {
    background: 'rgba(232,177,92,.1)',
    color: 'var(--v-gold-light)',
    border: '1px solid rgba(232,177,92,.25)',
  },
  secondary: {
    background: 'rgba(232,177,92,.08)',
    color: 'var(--v-gold-light)',
    border: '1px solid var(--v-border)',
  },
  outline: {
    background: 'transparent',
    color: 'var(--v-fg-muted)',
    border: '1px solid var(--v-border)',
  },
  destructive: {
    background: 'rgba(212,134,128,.1)',
    color: 'var(--v-red)',
    border: '1px solid rgba(212,134,128,.3)',
  },
};

export function BadgeList({ items, variant = 'secondary', className = '' }: BadgeListProps) {
  if (!items || items.length === 0) {
    return (
      <p
        className="v-italic"
        style={{
          color: 'var(--v-fg-muted)',
          fontFamily: 'var(--font-fraunces), Georgia, serif',
        }}>
        Not specified
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((item, index) => (
        <span key={`${item}-${index}`} style={{ ...basePill, ...velourVariants[variant] }}>
          {item}
        </span>
      ))}
    </div>
  );
}

interface InterestBadgeListProps {
  interests: string[];
  className?: string;
}

export function InterestBadgeList({ interests, className = '' }: InterestBadgeListProps) {
  if (!interests || interests.length === 0) {
    return (
      <p
        className="v-italic"
        style={{
          color: 'var(--v-fg-muted)',
          fontFamily: 'var(--font-fraunces), Georgia, serif',
        }}>
        No interests added
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {interests.map((interest, index) => (
        <span
          key={`${interest}-${index}`}
          style={{
            ...basePill,
            padding: '7px 14px',
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontStyle: 'italic',
            fontSize: 13,
            background: 'rgba(232,177,92,.08)',
            color: 'var(--v-gold-light)',
            border: '1px solid rgba(232,177,92,.22)',
          }}>
          {interest}
        </span>
      ))}
    </div>
  );
}
