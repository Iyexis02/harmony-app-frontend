interface InfoItemProps {
  label: string;
  value: string | number;
  className?: string;
}

export function InfoItem({ label, value, className = '' }: InfoItemProps) {
  return (
    <div
      className={`p-4 ${className}`}
      style={{
        background: 'var(--v-row)',
        border: '1px solid var(--v-row-border)',
        borderRadius: 12,
      }}>
      <p
        className="v-mono mb-1.5"
        style={{ fontSize: 10, color: 'var(--v-fg-faint)' }}>
        {label}
      </p>
      <p
        className="v-display"
        style={{ fontSize: 16, fontWeight: 500, color: 'var(--v-fg)', lineHeight: 1.25 }}>
        {value}
      </p>
    </div>
  );
}

interface InfoGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function InfoGrid({ children, columns = 2, className = '' }: InfoGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>{children}</div>;
}
