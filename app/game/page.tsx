import { Suspense } from 'react';
import { BoardRoom } from '@/components/BoardRoom';

export const metadata = { title: 'Sảnh trò chơi' };

export default function GamePage({ searchParams }: { searchParams: { play?: string } }) {
  // Quiz board game floats as a popup over the arena — stays on the /game path.
  if (searchParams?.play === 'quiz') {
    return (
      <Suspense fallback={<div className="text-center text-muted py-20">Đang tải…</div>}>
        <BoardRoom />
      </Suspense>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-text mb-3">Sảnh trò chơi</h1>
      <p className="text-muted">
        Vào Đấu trường 3D để tạo phòng Quiz hoặc Tranh luận và chia sẻ mã cho các nhóm khác.
      </p>

      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <a href="/game/describe" className="block rounded-2xl border border-border bg-surface p-6 hover:shadow-md transition">
          <h2 className="font-display text-xl text-text mb-1">👁️ Mô Tả &amp; Đoán Thẻ</h2>
          <p className="text-muted text-sm">
            Mỗi nhóm viết mô tả cho thẻ của mình, các nhóm khác giơ thẻ đoán qua camera. Có phản biện &amp; bỏ phiếu.
          </p>
          <span className="inline-block mt-3 text-primary font-semibold text-sm">Vào phòng →</span>
        </a>
      </div>
    </div>
  );
}
