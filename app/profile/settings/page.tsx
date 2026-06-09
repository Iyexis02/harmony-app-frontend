'use client';

import { AlertCircle, ArrowLeft, CheckCircle, Link as LinkIcon, Loader2 } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { SpotifyIcon } from '@/components/icons/SpotifyIcon';

import { InfoItem, ProfileSection } from '@/app/components/profile';
import { resendVerificationEmail } from '@/app/serverActions/auth';
import { getCompleteProfile } from '@/app/serverActions/onboarding';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { AUTH_PROVIDER_LABELS, SETTINGS_ACTIONS, SETTINGS_SECTIONS, VALIDATION_MESSAGES } from '@/lib/profileConstants';

const SPOTIFY_CONNECTION_MESSAGES = {
  spotify_connected: 'Spotify account connected successfully!',
  not_authenticated: 'You must be logged in to connect Spotify.',
  already_spotify: 'You are already using Spotify authentication.',
  spotify_denied: 'Spotify connection was cancelled.',
  no_code: 'No authorization code received from Spotify.',
  token_exchange_failed: 'Failed to exchange tokens with Spotify.',
  profile_fetch_failed: 'Failed to fetch your Spotify profile.',
  backend_failed: 'Failed to save Spotify connection.',
  unknown: 'An unknown error occurred.',
} as const;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080';

/**
 * Extracts the Cloudinary public ID from a secure_url.
 * e.g. "https://res.cloudinary.com/demo/image/upload/v1234/dating-app/profiles/user/photo.jpg"
 *   → "dating-app/profiles/user/photo"
 */
function extractCloudinaryPublicId(url: string): string | null {
  if (!url.includes('cloudinary.com')) return null;
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return null;
  const afterUpload = url.slice(uploadIndex + '/upload/'.length);
  const withoutVersion = afterUpload.replace(/^v\d+\//, '');
  return withoutVersion.replace(/\.[a-z0-9]+$/i, '');
}

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Email verification
  const [emailVerified, setEmailVerified] = useState<boolean>(() => !!(session as any)?.emailVerified);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Spotify connection
  const [spotifyLinked, setSpotifyLinked] = useState<boolean>(false);
  const [spotifyMessage, setSpotifyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isConnectingSpotify, setIsConnectingSpotify] = useState(false);

  // Delete account
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync emailVerified from session once it loads
  useEffect(() => {
    if (session) setEmailVerified(!!(session as any).emailVerified);
  }, [session]);

  // Bootstrap spotifyLinked from user-scoped localStorage key once session is known
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid || typeof window === 'undefined') return;
    setSpotifyLinked(localStorage.getItem(`spotifyLinked:${uid}`) === 'true');
  }, [session?.user?.id]);

  // Cooldown cleanup
  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  // Refresh session when user returns to this tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [update]);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const message = searchParams.get('message');

    if (success === 'spotify_connected') {
      setSpotifyMessage({ type: 'success', text: SPOTIFY_CONNECTION_MESSAGES.spotify_connected });
      setSpotifyLinked(true);
      if (session?.user?.id) localStorage.setItem(`spotifyLinked:${session.user.id}`, 'true');
      router.replace('/profile/settings');
    } else if (error) {
      const errorKey = error as keyof typeof SPOTIFY_CONNECTION_MESSAGES;
      setSpotifyMessage({
        type: 'error',
        text: SPOTIFY_CONNECTION_MESSAGES[errorKey] || message || SPOTIFY_CONNECTION_MESSAGES.unknown,
      });
      setTimeout(() => router.replace('/profile/settings'), 100);
    }
  }, [searchParams, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  const startCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(cooldownRef.current!); cooldownRef.current = null; return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const handleResendVerification = async () => {
    if (!session.user?.email || resendCooldown > 0) return;
    setIsResending(true);
    setResendError(null);
    setResendSuccess(false);
    try {
      const result = await resendVerificationEmail({ email: session.user.email });
      if (!result.ok) {
        if (/already.?verified/i.test(result.error.message)) {
          setEmailVerified(true);
          update();
        } else {
          setResendError(result.error.message);
        }
        return;
      }
      setResendSuccess(true);
      startCooldown();
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setResendError(err.message || 'Failed to resend email');
    } finally {
      setIsResending(false);
    }
  };

  const handleConnectSpotify = () => {
    setIsConnectingSpotify(true);
    window.location.href = '/api/spotify/connect';
  };

  const handleDeleteAccount = async () => {
    const authProvider = (session as any).authProvider as string;
    const isEmail = authProvider === 'EMAIL';

    if (isEmail && !deletePassword) return;
    if (!isEmail && deleteConfirmText !== 'DELETE') return;

    setIsDeleting(true);
    setDeletePasswordError(null);
    let wrongPassword = false;
    try {
      const token = (session as any).accessToken;

      // Fetch photos before deletion while the profile (and session) still exist.
      // Best-effort: if the fetch fails we still proceed with account deletion.
      const profileResult = await getCompleteProfile();
      const photoPublicIds: string[] = [];
      if (profileResult.ok) {
        for (const photo of profileResult.data.photos) {
          const publicId = extractCloudinaryPublicId(photo.imageUrl);
          if (publicId) photoPublicIds.push(publicId);
        }
      }

      const res = await fetch(`${API_BASE}/api/v1/users/me`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(isEmail && { 'Content-Type': 'application/json' }),
        },
        body: isEmail ? JSON.stringify({ password: deletePassword }) : undefined,
      });
      if (res.ok) {
        // Clean up Cloudinary assets. Session is still valid here so the
        // /api/cloudinary/delete ownership check passes. Promise.allSettled
        // ensures a single failed delete does not block sign-out.
        if (photoPublicIds.length > 0) {
          await Promise.allSettled(photoPublicIds.map((id) => deleteFromCloudinary(id)));
        }

        // Set flag before signOut so any in-flight hook requests (notification
        // polling, match fetches) see it and skip their own signOut({ redirect: true })
        // calls, which would race with our router.push('/') below.
        localStorage.setItem('accountDeleted', 'true');
        await signOut({ redirect: false });
        router.push('/');
      } else {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401 || body.code === 'UNAUTHORIZED') {
          wrongPassword = true;
          setDeletePasswordError('Incorrect password');
          setDeletePassword('');
        } else {
          toast.error(body.message || 'Account deletion failed. Please try again.');
        }
      }
    } catch {
      toast.error('Network error — account not deleted.');
    } finally {
      setIsDeleting(false);
      if (!wrongPassword) {
        setShowDeleteDialog(false);
        setDeleteConfirmText('');
        setDeletePassword('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.push('/profile')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">Account Settings</h1>
          <p className="text-muted-foreground">Manage your account and security settings</p>
        </div>

        <div className="space-y-6">
          {/* Account Information */}
          <ProfileSection title={SETTINGS_SECTIONS.ACCOUNT_INFO.title} icon={SETTINGS_SECTIONS.ACCOUNT_INFO.icon}>
            <div className="space-y-4">
              <InfoItem label="Email Address" value={session.user?.email || 'Not available'} />

              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">Authentication Method</p>
                <div className="flex items-center gap-2">
                  {(session as any).authProvider === 'SPOTIFY' ? (
                    <>
                      <SpotifyIcon className="h-5 w-5 text-[#1DB954]" />
                      <p className="text-foreground font-medium">{AUTH_PROVIDER_LABELS.SPOTIFY}</p>
                    </>
                  ) : (
                    <>
                      <SETTINGS_SECTIONS.ACCOUNT_INFO.icon className="h-5 w-5 text-primary" />
                      <p className="text-foreground font-medium">{AUTH_PROVIDER_LABELS.EMAIL}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">Email Verification Status</p>
                <div className="flex items-center gap-2">
                  {emailVerified ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <p className="text-foreground font-medium">Verified</p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      <p className="text-foreground font-medium">Not Verified</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleResendVerification}
                        disabled={isResending || resendCooldown > 0}
                        className="h-auto p-0 text-primary">
                        {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
                      </Button>
                    </>
                  )}
                </div>
                {resendSuccess && <p className="text-sm text-green-500 mt-1">{VALIDATION_MESSAGES.EMAIL_SENT}</p>}
                {resendError && <p className="text-sm text-destructive mt-1">{resendError}</p>}
              </div>
            </div>
          </ProfileSection>

          {/* Security Settings */}
          <ProfileSection title={SETTINGS_SECTIONS.SECURITY.title} icon={SETTINGS_SECTIONS.SECURITY.icon}>
            <div className="space-y-3">
              {(session as any).authProvider === 'EMAIL' && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/forgot-password')}>
                  <SETTINGS_ACTIONS.CHANGE_PASSWORD.icon className="w-4 h-4 mr-2" />
                  {SETTINGS_ACTIONS.CHANGE_PASSWORD.label}
                </Button>
              )}

              <Button variant="outline" className="w-full justify-start" onClick={() => signOut({ callbackUrl: '/' })}>
                <SETTINGS_ACTIONS.SIGN_OUT.icon className="w-4 h-4 mr-2" />
                {SETTINGS_ACTIONS.SIGN_OUT.label}
              </Button>
            </div>
          </ProfileSection>

          {/* Spotify Connection */}
          {(session as any).authProvider === 'EMAIL' && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <LinkIcon className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Connected Accounts</h2>
              </div>

              <div className="space-y-4">
                {spotifyMessage && (
                  <div
                    className={`flex items-start gap-2 p-3 rounded-lg ${
                      spotifyMessage.type === 'success'
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-destructive/10 border border-destructive/20'
                    }`}>
                    {spotifyMessage.type === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                    )}
                    <p
                      className={`text-sm ${
                        spotifyMessage.type === 'success' ? 'text-green-500' : 'text-destructive'
                      }`}>
                      {spotifyMessage.text}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <SpotifyIcon className="h-8 w-8 text-[#1DB954]" />
                    <div>
                      <p className="font-medium">Spotify</p>
                      <p className="text-sm text-muted-foreground">
                        {spotifyLinked ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleConnectSpotify}
                    disabled={isConnectingSpotify || spotifyLinked}>
                    {isConnectingSpotify ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : spotifyLinked ? (
                      'Connected'
                    ) : (
                      'Connect'
                    )}
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Connect your Spotify account to enhance your music preferences and get better matches based on your
                  listening history.
                </p>
              </div>
            </Card>
          )}

          {/* Privacy Settings */}
          <ProfileSection title={SETTINGS_SECTIONS.PRIVACY.title} icon={SETTINGS_SECTIONS.PRIVACY.icon}>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/edit-profile#privacy')}>
                <SETTINGS_SECTIONS.PRIVACY.icon className="w-4 h-4 mr-2" />
                Manage Privacy Settings
              </Button>
              <p className="text-sm text-muted-foreground">
                Control who can see your profile, your activity status, and what information is visible to other users.
              </p>
            </div>
          </ProfileSection>

          <Separator />

          {/* Danger Zone */}
          <Card className="p-6 border-destructive/50">
            <div className="flex items-center gap-2 mb-4">
              <SETTINGS_SECTIONS.DANGER_ZONE.icon className="h-5 w-5 text-destructive" />
              <h2 className="text-xl font-semibold text-destructive">{SETTINGS_SECTIONS.DANGER_ZONE.title}</h2>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Once you delete your account, there is no going back. Please be certain.
              </p>

              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteDialog(true)}>
                <SETTINGS_ACTIONS.DELETE_ACCOUNT.icon className="w-4 h-4 mr-2" />
                {SETTINGS_ACTIONS.DELETE_ACCOUNT.label}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteDialog(false);
            setDeleteConfirmText('');
            setDeletePassword('');
            setDeletePasswordError(null);
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Your Account?</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All your matches, preferences, and profile data will be deleted immediately.
            </DialogDescription>
          </DialogHeader>
          {(session as any).authProvider === 'EMAIL' ? (
            <div className="py-2 space-y-2">
              <label className="text-sm text-foreground">
                Enter your password to confirm deletion
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => { setDeletePassword(e.target.value); setDeletePasswordError(null); }}
                placeholder="Your password"
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-destructive/50"
              />
              {deletePasswordError && (
                <p className="text-sm text-destructive">{deletePasswordError}</p>
              )}
            </div>
          ) : (
            <div className="py-2 space-y-2">
              <label className="text-sm text-foreground">
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-destructive/50"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText(''); setDeletePassword(''); setDeletePasswordError(null); }}
              disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={
                isDeleting ||
                ((session as any).authProvider === 'EMAIL'
                  ? !deletePassword
                  : deleteConfirmText !== 'DELETE')
              }>
              {isDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting…</> : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
