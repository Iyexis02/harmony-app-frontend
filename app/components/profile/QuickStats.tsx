import { QUICK_STATS } from '@/lib/profileConstants';

interface Stat {
  label: string;
  value: number;
  colorClass: string;
}

interface QuickStatsProps {
  stats: Stat[];
  className?: string;
}

export function QuickStats({ stats, className = '' }: QuickStatsProps) {
  return (
    <div
      className={`grid gap-0 pt-4 ${stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} ${className}`}
      style={{ borderTop: '1px solid var(--v-divider)' }}>
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className="text-center"
          style={{
            borderRight:
              i < stats.length - 1 ? '1px solid var(--v-divider)' : 'none',
          }}>
          <div
            className="v-display v-gold"
            style={{ fontSize: 26, fontWeight: 500, lineHeight: 1 }}>
            {stat.value}
          </div>
          <div
            className="v-mono"
            style={{ fontSize: 9.5, color: 'var(--v-fg-faint)', marginTop: 6 }}>
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export function createProfileStats(profile: { photos?: unknown[]; musicPreferences?: { favoriteGenres?: unknown[] } }): Stat[] {
  return [
    {
      label: QUICK_STATS.PHOTOS.label,
      value: profile.photos?.length || 0,
      colorClass: QUICK_STATS.PHOTOS.colorClass,
    },
    {
      label: QUICK_STATS.GENRES.label,
      value: profile.musicPreferences?.favoriteGenres?.length || 0,
      colorClass: QUICK_STATS.GENRES.colorClass,
    },
  ];
}
