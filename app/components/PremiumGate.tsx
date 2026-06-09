'use client';

import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PremiumGateProps {
  locked: boolean;
  children: React.ReactNode;
  title?: string;
  description?: string;
}

/**
 * Wraps content behind a premium paywall when `locked={true}`.
 * When `locked={false}`, renders children transparently with zero overhead.
 *
 * The overlay disables pointer events on the gated content to prevent
 * interaction through the blur. Wired to Stripe in Batch 19.
 */
export default function PremiumGate({
  locked,
  children,
  title = 'Premium Feature',
  description = 'Upgrade to Harmony Premium to unlock this feature.',
}: PremiumGateProps) {
  if (!locked) return <>{children}</>;

  return (
    <div className="relative">
      {/* Gated content — blurred and non-interactive */}
      <div className="pointer-events-none select-none blur-sm" aria-hidden="true">
        {children}
      </div>

      {/* Overlay CTA */}
      <div className="absolute inset-0 pointer-events-auto flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-[2px] rounded-lg">
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <div className="bg-primary/10 rounded-full p-3">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
        </div>
        <Button size="sm" className="shadow-md">
          Unlock Premium
        </Button>
      </div>
    </div>
  );
}
