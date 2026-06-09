'use client';

import { Suspense, useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Music, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

import { loginSchema, type LoginFormData } from '@/lib/authSchemas';
import { RegistrationStage } from '@/app/enums/user/userEnum';
import { SpotifyIcon } from '@/components/icons/SpotifyIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/discover';

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('email-password', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        // NextAuth credentials provider exposes backend errors via result.error.
        // Map known error strings to user-friendly messages; fall back to a generic one.
        const errString = result.error.toLowerCase();
        if (errString.includes('locked')) {
          setError('Account temporarily locked due to too many failed attempts. Please try again later.');
        } else {
          setError('Invalid email or password');
        }
        setIsLoading(false);
        return;
      }

      // Fetch the fresh session to honor registrationStage routing.
      // Anything other than FINISHED means the user still has onboarding to complete.
      const session = await getSession();
      if (session?.registrationStage !== RegistrationStage.FINISHED) {
        router.push('/onboarding');
      } else {
        router.push(callbackUrl);
      }
    } catch (err: unknown) {
      const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : null;
      setError(msg || 'Something went wrong. Please try again.');
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
          {/* Gold top hairline */}
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
              — welcome back —
            </span>
            <h1
              className="v-display"
              style={{ fontSize: 30, fontWeight: 500, color: 'var(--v-fg)' }}>
              The room <span className="v-italic v-gold">remembers you.</span>
            </h1>
            <p
              style={{
                color: 'var(--v-fg-muted)',
                fontSize: 14,
                fontStyle: 'italic',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
              }}>
              Sign in to pick up where the music left off.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
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

          {/* Login Form */}
          <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="login-email"
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
              <Label htmlFor="login-password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  {...form.register('password')}
                  className="pl-10"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Link href="/forgot-password" className="inline-block text-sm text-primary hover:underline">
              Forgot password?
            </Link>

            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="w-full py-6 rounded-full v-cta-gold">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          {/* Footer */}
          <p
            className="text-sm text-center"
            style={{ color: 'var(--v-fg-muted)' }}>
            New here?{' '}
            <Link
              href="/register"
              className="v-italic"
              style={{
                color: 'var(--v-gold-light)',
                fontFamily: 'var(--font-fraunces), Georgia, serif',
              }}>
              Begin your story
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
