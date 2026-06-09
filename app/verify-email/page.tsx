'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CheckCircle, XCircle, Loader2, ArrowRight, Mail } from 'lucide-react';

import { verifyEmail, resendVerificationEmail } from '@/app/serverActions/auth';
import { ErrorCode } from '@/types/error';
import { Button } from '@/components/ui/button';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { data: session } = useSession();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const [isExpiredToken, setIsExpiredToken] = useState(false);

  // Resend state
  const [resendEmailInput, setResendEmailInput] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Effective email: prefer session email, fall back to manual input
  const resendEmail = session?.user?.email ?? resendEmailInput;

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. No token provided.');
        return;
      }

      try {
        const result = await verifyEmail({ token });

        if (!result.ok) {
          setStatus('error');
          if (result.error.code === ErrorCode.INVALID_TOKEN) {
            setIsExpiredToken(true);
            setMessage('This verification link has expired.');
          } else {
            setMessage(result.error.message || 'Verification failed. The link may have expired.');
          }
          return;
        }

        setStatus('success');
        setMessage('Email verified successfully! You can now enjoy all features.');
      } catch (err: unknown) {
        setStatus('error');
        const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : null;
        setMessage(msg || 'Something went wrong. Please try again.');
      }
    };

    verify();
  }, [token, router]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const handleResend = async () => {
    const email = resendEmail.trim();
    if (!email) return;

    setResendStatus('sending');
    setResendError(null);

    let rateLimited = false;
    try {
      const result = await resendVerificationEmail({ email });
      if (!result.ok && result.error.status === 429) {
        rateLimited = true;
        setResendError(result.error.message);
      }
    } catch {
      // Always show success to prevent email enumeration
    }

    if (rateLimited) {
      setResendStatus('idle');
      return;
    }

    setResendStatus('sent');
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          setResendStatus('idle');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="v-page-texture" />
      <div className="v-grain" />
      <div className="w-full max-w-md relative z-10">
        <div
          className="p-8 space-y-6 relative"
          style={{
            background: 'var(--v-card)',
            border: '1px solid var(--v-border)',
            borderRadius: 22,
            boxShadow: 'var(--v-shadow-card)',
          }}>
          <div
            className="absolute"
            style={{
              top: 0,
              left: '15%',
              right: '15%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, var(--v-gold), transparent)',
            }}
          />
          {/* Icon */}
          <div className="flex justify-center">
            {status === 'loading' && (
              <div
                className="flex items-center justify-center"
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  background: 'rgba(232,177,92,.1)',
                  border: '1px solid var(--v-border)',
                }}>
                <Loader2 style={{ width: 28, height: 28, color: 'var(--v-gold)' }} className="animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div
                className="flex items-center justify-center animate-in zoom-in duration-300"
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(167,211,155,.25), rgba(167,211,155,.08))',
                  border: '1px solid rgba(167,211,155,.35)',
                }}>
                <CheckCircle style={{ width: 28, height: 28, color: 'var(--v-green)' }} />
              </div>
            )}
            {status === 'error' && (
              <div
                className="flex items-center justify-center animate-in zoom-in duration-300"
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  background: 'rgba(212,134,128,.12)',
                  border: '1px solid rgba(212,134,128,.3)',
                }}>
                <XCircle style={{ width: 28, height: 28, color: 'var(--v-red)' }} />
              </div>
            )}
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <span
              className="v-mono"
              style={{
                fontSize: 11,
                color:
                  status === 'success'
                    ? 'var(--v-green)'
                    : status === 'error'
                    ? 'var(--v-red)'
                    : 'var(--v-gold)',
              }}>
              {status === 'loading' && '— reading the letter —'}
              {status === 'success' && '— seal broken —'}
              {status === 'error' && '— the seal is old —'}
            </span>
            <h1 className="v-display" style={{ fontSize: 30, fontWeight: 500, color: 'var(--v-fg)' }}>
              {status === 'loading' && (
                <>
                  Verifying your <span className="v-italic v-gold">email</span>.
                </>
              )}
              {status === 'success' && (
                <>
                  You&apos;re <span className="v-italic v-gold">verified.</span>
                </>
              )}
              {status === 'error' && (
                <>
                  Verification <span className="v-italic v-gold">faltered.</span>
                </>
              )}
            </h1>
            <p
              style={{
                color: 'var(--v-fg-muted)',
                fontSize: 14,
                fontStyle: 'italic',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
              }}>
              {message}
            </p>
          </div>

          {/* Actions */}
          {status === 'success' && (
            <div className="space-y-3">
              <Button
                onClick={() => router.push('/')}
                size="lg"
                className="w-full rounded-full v-cta-gold"
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-center text-muted-foreground">
                  {isExpiredToken
                    ? 'This verification link has expired. Request a new one below.'
                    : 'The verification link may have expired or is invalid.'}
                </p>
              </div>

              {/* Resend section — promoted to primary action when token is expired */}
              <div className={`rounded-lg p-4 space-y-3 ${isExpiredToken ? 'border-2 border-primary bg-primary/5' : 'border border-border'}`}>
                <p className="text-sm font-medium text-foreground">
                  {isExpiredToken ? 'Get a new verification link' : 'Resend verification email'}
                </p>
                {!session?.user?.email && (
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={resendEmailInput}
                      onChange={(e) => setResendEmailInput(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-foreground"
                    />
                  </div>
                )}
                {session?.user?.email && (
                  <p className="text-sm text-muted-foreground">
                    Sending to <span className="text-foreground font-medium">{session.user.email}</span>
                  </p>
                )}
                {resendStatus === 'sent' && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Sent! Check your inbox and spam folder.
                  </p>
                )}
                {resendError && (
                  <p className="text-xs text-destructive">{resendError}</p>
                )}
                <Button
                  onClick={handleResend}
                  disabled={resendStatus === 'sending' || resendCooldown > 0 || !resendEmail.trim()}
                  variant={isExpiredToken ? 'default' : 'outline'}
                  size={isExpiredToken ? 'lg' : 'sm'}
                  className="w-full"
                >
                  {resendStatus === 'sending' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
                </Button>
              </div>

              <Button
                onClick={() => router.push('/')}
                size="lg"
                variant="outline"
                className="w-full font-semibold rounded-lg border-border hover:bg-muted/50 transition-all duration-300"
              >
                Back to Home
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
