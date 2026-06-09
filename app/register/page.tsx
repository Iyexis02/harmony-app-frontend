'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Music, Mail, Lock, User, AlertCircle, CheckCircle, Circle, Loader2 } from 'lucide-react';

import { registerSchema, type RegisterFormData, getPasswordRequirements } from '@/lib/authSchemas';
import { registerWithEmail } from '@/app/serverActions/auth';
import { applyBackendErrors } from '@/lib/formErrors';
import { ErrorCode } from '@/types/error';
import { SpotifyIcon } from '@/components/icons/SpotifyIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailExists, setEmailExists] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = form.watch('password') ?? '';
  const passwordRequirements = getPasswordRequirements(passwordValue);

  const handleRegister = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    setEmailExists(false);
    setSuccessMessage(null);

    try {
      const result = await registerWithEmail({
        email: data.email,
        name: data.name,
        password: data.password,
      });

      if (!result.ok) {
        if (result.error.code === ErrorCode.EMAIL_EXISTS) {
          setEmailExists(true);
        } else {
          applyBackendErrors(result.error, form.setError, setError);
        }
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        `Account created! Please check ${data.email} for a verification link. You can continue to onboarding.`
      );

      const signInResult = await signIn('email-password', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError('Account created but login failed. Please try logging in manually.');
        setIsLoading(false);
        return;
      }

      router.push('/onboarding');
    } catch (err: unknown) {
      const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : null;
      setError(msg || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpotifySignIn = () => {
    signIn('spotify', { callbackUrl: '/onboarding' });
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
              background:
                'linear-gradient(90deg, transparent, var(--v-gold), transparent)',
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
                  background: 'var(--v-gold-grad-135)',
                  boxShadow: 'var(--v-shadow-gold-glow)',
                }}>
                <Music style={{ width: 26, height: 26, color: 'var(--v-ink)' }} strokeWidth={2.25} />
              </div>
            </div>
            <span className="v-mono" style={{ fontSize: 11, color: 'var(--v-gold)' }}>
              — an invitation —
            </span>
            <h1
              className="v-display"
              style={{ fontSize: 30, fontWeight: 500, color: 'var(--v-fg)' }}>
              Begin your <span className="v-italic v-gold">story.</span>
            </h1>
            <p
              style={{
                color: 'var(--v-fg-muted)',
                fontSize: 14,
                fontStyle: 'italic',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
              }}>
              Join the hopeless listeners — free, no credit card, take your time.
            </p>
          </div>

          {/* Error/Success Messages */}
          {emailExists && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">
                This email is already registered.{' '}
                <Link href="/login" className="underline font-medium">
                  Log in instead
                </Link>
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-500">{successMessage}</p>
            </div>
          )}

          {/* Spotify OAuth Button */}
          <Button
            onClick={handleSpotifySignIn}
            size="lg"
            disabled={isLoading}
            className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-semibold py-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-3">
            <SpotifyIcon className="h-6 w-6" />
            Continue with Spotify
          </Button>

          {/* Divider */}
          <div className="relative">
            <Separator className="my-4" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-sm text-muted-foreground">
              or
            </span>
          </div>

          {/* Register Form */}
          <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-name" className="text-sm font-medium text-foreground">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  {...form.register('name')}
                  className="pl-10"
                  placeholder="John Doe"
                  disabled={isLoading}
                />
              </div>
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="register-email"
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

            <div className="space-y-2">
              <Label htmlFor="register-password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  {...form.register('password')}
                  className="pl-10"
                  placeholder="Create a strong password"
                  disabled={isLoading}
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
              {(form.formState.dirtyFields.password || passwordValue.length > 0) && (
                <ul className="mt-2 space-y-1">
                  {passwordRequirements.map((req) => (
                    <li
                      key={req.label}
                      className={`flex items-center gap-1.5 text-xs ${req.met ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {req.met ? <CheckCircle className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                      {req.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-confirm-password" className="text-sm font-medium text-foreground">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="register-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  {...form.register('confirmPassword')}
                  className="pl-10"
                  placeholder="Confirm your password"
                  disabled={isLoading}
                />
              </div>
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full py-6 rounded-full v-cta-gold">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating account…
                </>
              ) : (
                'Begin'
              )}
            </Button>
          </form>

          {/* Footer */}
          <p
            className="text-sm text-center"
            style={{ color: 'var(--v-fg-muted)' }}>
            Already have an account?{' '}
            <Link
              href="/login"
              className="v-italic"
              style={{
                color: 'var(--v-gold-light)',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
              }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
