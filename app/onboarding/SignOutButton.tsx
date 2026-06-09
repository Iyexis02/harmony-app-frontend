'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function SignOutButton() {
  return (
    <Button
      onClick={() => signOut({ callbackUrl: '/login' })}
      size="lg"
      className="rounded-full">
      Try signing in again
    </Button>
  );
}
