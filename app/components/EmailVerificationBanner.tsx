'use client';

import { CheckCircle, Mail, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { resendVerificationEmail } from '@/app/serverActions/auth';
import { Button } from '@/components/ui/button';

export default function EmailVerificationBanner() {
  const { data: session, update } = useSession();
  const [isResending, setIsResending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh session when the user returns to the tab (they may have clicked the verify link)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        update();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [update]);

  // Poll every 30s while the banner is visible as a fallback
  useEffect(() => {
    const interval = setInterval(() => update(), 30_000);
    return () => clearInterval(interval);
  }, [update]);

  // Only show for email users who haven't verified
  if (!session || session.emailVerified === true || session.authProvider !== 'EMAIL' || isDismissed) {
    return null;
  }

  const handleResendEmail = async () => {
    if (!session.user?.email) return;

    setIsResending(true);
    setError(null);
    setShowSuccess(false);

    try {
      const result = await resendVerificationEmail({ email: session.user.email });

      if (!result.ok) {
        if (/already.?verified/i.test(result.error.message)) {
          // Email is already verified — refresh the session so the banner disappears
          update();
        } else {
          setError(result.error.message);
        }
        return;
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-linear-to-r from-amber-500/10 via-amber-400/10 to-amber-500/10 border-b border-amber-500/20 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="shrink-0 p-2 bg-amber-500/20 rounded-full">
              <Mail className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Please verify your email address</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Check your inbox for a verification link or{' '}
                <button
                  onClick={handleResendEmail}
                  disabled={isResending}
                  className="text-amber-500 hover:text-amber-600 font-medium underline disabled:opacity-50 disabled:cursor-not-allowed">
                  {isResending ? 'Sending...' : 'resend email'}
                </button>
              </p>
              {showSuccess && (
                <div className="flex items-center gap-1 mt-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <p className="text-xs text-green-500">Verification email sent!</p>
                </div>
              )}
              {error && <p className="text-xs text-destructive mt-1">{error}</p>}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="shrink-0 h-8 w-8 p-0 hover:bg-amber-500/20"
            aria-label="Dismiss banner">
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
}
