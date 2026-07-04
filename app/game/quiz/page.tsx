import { Suspense } from 'react';
import { BoardRoom } from '@/components/BoardRoom';

export const metadata = { title: 'Cờ Tỷ Phú — Đại Sứ Tri Thức' };

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-muted">Đang vào phòng…</div>}>
      <BoardRoom />
    </Suspense>
  );
}
