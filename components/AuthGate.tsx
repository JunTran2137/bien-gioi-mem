'use client';
import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { GroupSelector } from './GroupSelector';
import { useGroup } from '@/hooks/useGroup';
import { toast } from '@/components/ui/toast';

export function AuthGate() {
  const { status } = useSession();
  const { user, refresh } = useGroup();
  const [open, setOpen] = useState(false);
  const greetedRef = useRef(false);
  const promptedRef = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || !user?.authenticated) return;
    if (user.groupId && !greetedRef.current) {
      greetedRef.current = true;
      toast({
        title: `Chào mừng trở lại, ${user.name?.split(' ').slice(-1)[0] || ''}!`,
        description: user.groupName ? `Nhóm ${user.groupName}` : undefined,
        variant: 'success'
      });
    } else if (!user.groupId && !promptedRef.current) {
      promptedRef.current = true;
      setOpen(true);
    }
  }, [status, user]);

  // Allow other components (e.g. AuthModal3D) to trigger the group selector.
  useEffect(() => {
    const onOpen = () => {
      if (status === 'authenticated') setOpen(true);
    };
    window.addEventListener('open-group-selector', onOpen);
    return () => window.removeEventListener('open-group-selector', onOpen);
  }, [status]);

  return (
    <GroupSelector
      open={open}
      currentGroupId={user?.groupId ?? null}
      onConfirmed={(_, name) => {
        setOpen(false);
        toast({ title: `Đã tham gia nhóm ${name}`, variant: 'success' });
        refresh();
      }}
      onClose={() => setOpen(false)}
    />
  );
}
