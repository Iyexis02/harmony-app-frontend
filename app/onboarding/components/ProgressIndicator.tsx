'use client';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

const STEP_NAMES = [
  'Basics',
  'Whereabouts',
  'Portraits',
  'Listening',
  'Everyday',
  'Interior',
  'Wanted',
  'Curtain',
];

type Props = {
  currentStep: number;
  totalSteps: number;
  completionPercentage?: number;
};

export default function ProgressIndicator({ currentStep, totalSteps, completionPercentage }: Props) {
  const percentage = completionPercentage ?? ((currentStep + 1) / totalSteps) * 100;

  return (
    <div
      className="w-full sticky top-0 z-50"
      style={{
        background: 'rgba(27,15,26,.82)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        borderBottom: '1px solid var(--v-border)',
      }}>
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span
              className="v-display v-italic v-gold"
              style={{ fontSize: 24, fontWeight: 500, lineHeight: 1 }}>
              {ROMAN[currentStep] ?? `${currentStep + 1}`}
            </span>
            <span className="v-mono" style={{ fontSize: 10, color: 'var(--v-fg-faint)' }}>
              act {currentStep + 1} of {totalSteps}
            </span>
          </div>
          <span
            className="v-display v-italic"
            style={{ fontSize: 16, color: 'var(--v-gold-light)' }}>
            {STEP_NAMES[currentStep]}{' '}
            <span className="v-mono" style={{ fontSize: 10, color: 'var(--v-fg-faint)' }}>
              · {Math.round(percentage)}%
            </span>
          </span>
        </div>
        {/* Gold hairline progress */}
        <div
          className="relative"
          style={{
            height: 2,
            borderRadius: 9999,
            background: 'var(--v-divider)',
            overflow: 'hidden',
          }}>
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              background: 'var(--v-gold-grad)',
              boxShadow: '0 0 12px -2px rgba(232,177,92,.6)',
              transition: 'width .35s ease-out',
            }}
          />
        </div>
      </div>
    </div>
  );
}
