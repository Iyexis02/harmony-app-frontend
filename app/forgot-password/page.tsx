'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

import { forgotPassword } from '@/app/serverActions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get('sent') === 'true';

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await forgotPassword({ email: data.email });

      if (!result.ok) {
        // 429: rate limited — show wait time; this is safe to surface (not email enumeration)
        if (result.error.status === 429) {
          setError(result.error.message);
          setIsLoading(false);
          return;
        }
        // 5xx: genuine server error
        if (result.error.status >= 500) {
          setError('Something went wrong. Please try again later.');
          setIsLoading(false);
          return;
        }
        // Other 4xx: always show success to prevent user enumeration
      }

      router.replace('/forgot-password?sent=true');
    } catch {
      setError('Something went wrong. Please try again later.');
    } finally {
      setIsLoading(false);
    }
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
          {/* Back Button */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm italic transition-colors"
            style={{
              color: 'var(--v-fg-muted)',
              fontFamily: 'var(--font-fraunces), Georgia, serif',
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </button>

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: 'var(--v-gold-grad-135)',
                  boxShadow: 'var(--v-shadow-gold-glow)',
                }}>
                <Mail style={{ width: 26, height: 26, color: 'var(--v-ink)' }} strokeWidth={2.25} />
              </div>
            </div>
            <span className="v-mono" style={{ fontSize: 11, color: 'var(--v-gold)' }}>
              — lost the key? —
            </span>
            <h1
              className="v-display"
              style={{ fontSize: 30, fontWeight: 500, color: 'var(--v-fg)' }}>
              We&apos;ll send a <span className="v-italic v-gold">fresh one.</span>
            </h1>
            <p
              style={{
                color: 'var(--v-fg-muted)',
                fontSize: 14,
                fontStyle: 'italic',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
              }}>
              Enter your email and reset instructions will arrive shortly.
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {isSuccess && (
            <div className="space-y-3">
              <div
                className="flex items-start gap-3 p-4"
                style={{
                  background: 'rgba(167,211,155,.08)',
                  border: '1px solid rgba(167,211,155,.25)',
                  borderRadius: 14,
                }}>
                <CheckCircle
                  className="h-5 w-5 mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--v-green)' }}
                />
                <div className="flex-1">
                  <p
                    className="v-display v-italic mb-1"
                    style={{ fontSize: 16, fontWeight: 500, color: 'var(--v-green)' }}>
                    The letter is in the post.
                  </p>
                  <p style={{ fontSize: 12.5, color: 'var(--v-fg-muted)', lineHeight: 1.5 }}>
                    If an account exists with that email, a reset link will arrive shortly.
                    Check your inbox — and the spam folder, just in case.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => router.push('/')}
                size="lg"
                variant="outline"
                className="w-full font-semibold rounded-full italic"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--v-border-strong)',
                  color: 'var(--v-gold-light)',
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                }}
              >
                Back home
              </Button>
            </div>
          )}

          {/* Form */}
          {!isSuccess && (
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...form.register('email')}
                    className="pl-10"
                    placeholder="your@email.com"
                    disabled={isLoading}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="w-full py-6 rounded-full v-cta-gold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending…
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
            </form>
          )}

          {/* Help Text */}
          {!isSuccess && (
            <p
              className="text-sm text-center"
              style={{ color: 'var(--v-fg-muted)' }}>
              Remember your password?{' '}
              <button
                onClick={() => router.push('/login')}
                className="v-italic"
                style={{
                  color: 'var(--v-gold-light)',
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                }}>
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
