'use client';
import { SessionProvider as NextSessionProvider } from 'next-auth/react';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // refetchOnWindowFocus=false + no interval: during gameplay the host tab, the
  // camera tabs and the Google sign-in tab each stole focus and fired a
  // /api/auth/session request every time, flooding the server and adding lag.
  // The session doesn't change mid-game, so polling it is pure waste.
  return (
    <NextSessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      {children}
    </NextSessionProvider>
  );
}
