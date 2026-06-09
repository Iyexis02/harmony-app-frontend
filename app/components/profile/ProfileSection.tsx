import type { LucideIcon } from 'lucide-react';

interface ProfileSectionProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function ProfileSection({ title, icon: Icon, children, className = '' }: ProfileSectionProps) {
  return (
    <div
      className={`relative overflow-hidden p-6 ${className}`}
      style={{
        background: 'var(--v-card)',
        border: '1px solid var(--v-border)',
        borderRadius: 18,
        boxShadow: 'var(--v-shadow-lift)',
      }}>
      <div
        className="absolute"
        style={{
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            'linear-gradient(90deg, transparent, rgba(232,177,92,.3), transparent)',
        }}
      />
      <div className="flex items-center gap-3 mb-5">
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(232,177,92,.08)',
            border: '1px solid var(--v-border)',
          }}>
          <Icon style={{ width: 17, height: 17, color: 'var(--v-gold)' }} strokeWidth={1.75} />
        </div>
        <div>
          <p className="v-mono" style={{ fontSize: 10, color: 'var(--v-fg-faint)' }}>
            · section ·
          </p>
          <h2
            className="v-display"
            style={{ fontSize: 22, fontWeight: 500, color: 'var(--v-fg)', lineHeight: 1.1 }}>
            {title}
          </h2>
        </div>
      </div>
      {children}
    </div>
  );
}
