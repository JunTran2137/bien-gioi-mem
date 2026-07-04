'use client';
import { signIn, signOut, useSession } from 'next-auth/react';
import { LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="h-10 w-32 animate-pulse rounded-xl bg-primary-soft" />;
  }

  if (session) {
    return (
      <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
        <LogOut className="h-4 w-4" />
        <span>Đăng xuất</span>
      </Button>
    );
  }

  return (
    <Button onClick={() => signIn('google')} size="default">
      <LogIn className="h-4 w-4" />
      <span>Đăng nhập Google</span>
    </Button>
  );
}
