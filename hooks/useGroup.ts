'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface UserData {
  authenticated: boolean;
  uid?: string;
  name?: string;
  email?: string;
  avatar?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  totalScore?: number;
}

export function useGroup() {
  const { status } = useSession();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (status !== 'authenticated') {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/user', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser({ authenticated: false });
      }
    } catch {
      setUser({ authenticated: false });
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, loading, refresh };
}
