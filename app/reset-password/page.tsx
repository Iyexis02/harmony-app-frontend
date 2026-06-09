'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lock, ArrowRight, Loader2, CheckCircle, AlertCircle, XCircle, Eye, EyeOff } from 'lucide-react';

import { signOut } from 'next-auth/react';

import { resetPassword } from '@/app/serverActions/auth';
import { applyBackendErrors } from '@/lib/formErrors';
import { ErrorCode } from '@/types/error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PASSWORD_REGEX, PASSWORD_REGEX_MESSAGE } from '@/lib/authValidation';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password is too long')
      .regex(PASSWORD_REGEX, PASSWORD_REGEX_MESSAGE),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInvalidToken, setIsInvalidToken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const handleSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Invalid reset link. No token provided.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsInvalidToken(false);

    try {
      const result = await resetPassword({
        token,
        newPassword: data.password,
      });

      if (!result.ok) {
        if (result.error.code === ErrorCode.INVALID_TOKEN) {
          setIsInvalidToken(true);
          setError('This reset link has expired or is invalid.');
        } else {
          applyBackendErrors(result.error, form.setError, setError);
        }
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      // JWT is now invalid — proactively clear the session
      await signOut({ redirect: false });
    } catch (err: unknown) {
      const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : null;
      setError(msg || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show error if no token
  if (!token) {
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
            <div className="flex justify-center">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  background: 'rgba(212,134,128,.12)',
                  border: '1px solid rgba(212,134,128,.3)',
                }}>
                <XCircle style={{ width: 32, height: 32, color: 'var(--v-red)' }} />
              </div>
            </div>
            <div className="text-center space-y-2">
              <span className="v-mono" style={{ fontSize: 11, color: 'var(--v-red)' }}>
                — the key expired —
              </span>
              <h1 className="v-display" style={{ fontSize: 28, fontWeight: 500, color: 'var(--v-fg)' }}>
                A <span className="v-italic v-gold">new one</span> awaits.
              </h1>
              <p style={{ color: 'var(--v-fg-muted)', fontSize: 14, fontStyle: 'italic', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
                This reset link is invalid or past its moment. Request another and we&apos;ll begin again.
              </p>
            </div>
            <Button
              onClick={() => router.push('/forgot-password')}
              size="lg"
              className="w-full rounded-full v-cta-gold"
            >
              Request a new link
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: isSuccess
                    ? 'linear-gradient(135deg, rgba(167,211,155,.25), rgba(167,211,155,.1))'
                    : 'var(--v-gold-grad-135)',
                  boxShadow: isSuccess ? 'none' : 'var(--v-shadow-gold-glow)',
                  border: isSuccess ? '1px solid rgba(167,211,155,.35)' : 'none',
                }}>
                {isSuccess ? (
                  <CheckCircle style={{ width: 26, height: 26, color: 'var(--v-green)' }} />
                ) : (
                  <Lock style={{ width: 26, height: 26, color: 'var(--v-ink)' }} strokeWidth={2.25} />
                )}
              </div>
            </div>
            <span className="v-mono" style={{ fontSize: 11, color: 'var(--v-gold)' }}>
              {isSuccess ? '— new key, set. —' : '— a fresh key —'}
            </span>
            <h1 className="v-display" style={{ fontSize: 30, fontWeight: 500, color: 'var(--v-fg)' }}>
              {isSuccess ? (
                <>
                  Password <span className="v-italic v-gold">reset.</span>
                </>
              ) : (
                <>
                  Choose a <span className="v-italic v-gold">strong</span> one.
                </>
              )}
            </h1>
            <p style={{ color: 'var(--v-fg-muted)', fontSize: 14, fontStyle: 'italic', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
              {isSuccess
                ? 'Sign in with your new password to pick up the music.'
                : 'Write something only you would hum.'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">
                {error}
                {isInvalidToken && (
                  <>
                    {' '}
                    <Link href="/forgot-password" className="underline font-medium">
                      Request a new one
                    </Link>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Success State */}
          {isSuccess && (
            <div className="space-y-4">
              <Button
                onClick={() => router.push('/login')}
                size="lg"
                className="w-full rounded-full v-cta-gold"
              >
                Sign in
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Form */}
          {!isSuccess && (
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...form.register('password')}
                    className="pl-10 pr-10"
                    placeholder="Create a strong password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...form.register('confirmPassword')}
                    className="pl-10 pr-10"
                    placeholder="Confirm your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  Password must contain: uppercase, lowercase, number, and special character (@$!%*?&#)
                </p>
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
                    Resetting…
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
