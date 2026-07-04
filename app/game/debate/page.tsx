import { Suspense } from 'react';
import { DebateRoom } from '@/components/DebateRoom';

export const metadata = { title: 'Nghị Trường Quốc Tế — Tranh Luận' };

export default function DebatePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-muted">Đang vào phòng…</div>}>
      <DebateRoom />
    </Suspense>
  );
}
