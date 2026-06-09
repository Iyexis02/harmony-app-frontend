'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCcw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Profile page error:', error);
  }, [error]);

  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-destructive/10 rounded-full p-4">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Failed to load profile</h2>
          <p className="text-muted-foreground text-sm">
            Something went wrong while loading your profile. Try refreshing or go back.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" onClick={() => router.push('/discover')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go to Discover
          </Button>
        </div>
      </Card>
    </div>
  );
}
