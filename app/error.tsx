'use client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="mx-auto h-16 w-16 text-accent mb-4" />
        <h1 className="font-display text-3xl font-bold text-text mb-2">Có gì đó không ổn</h1>
        <p className="text-muted mb-6">Hệ thống đang gặp sự cố. Bạn có thể thử lại.</p>
        <Button onClick={() => reset()}>Thử lại</Button>
      </div>
    </div>
  );
}
