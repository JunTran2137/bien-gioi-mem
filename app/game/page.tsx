import { Suspense } from 'react';
import { DescribeRoom } from '@/components/DescribeRoom';
import { DebateRoom } from '@/components/DebateRoom';

export const metadata = { title: 'Sảnh trò chơi' };

export default function GamePage({ searchParams }: { searchParams: { play?: string } }) {
  if (searchParams?.play === 'describe' || searchParams?.play === 'quiz') {
    return (
      <Suspense fallback={<div className="text-center py-20 text-muted">Đang vào phòng…</div>}>
        <DescribeRoom />
      </Suspense>
    );
  }
  if (searchParams?.play === 'debate') {
    return (
      <Suspense fallback={<div className="text-center py-20 text-muted">Đang vào phòng…</div>}>
        <DebateRoom />
      </Suspense>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-text mb-3">Sảnh trò chơi</h1>
      <p className="text-muted">
        Chọn trò chơi, tạo phòng và chia sẻ mã cho các nhóm.
      </p>

      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <a href="/game/describe" className="block rounded-2xl border border-border bg-surface p-6 hover:shadow-md transition">
          <h2 className="font-display text-xl text-text mb-1">📜 Luận Giải</h2>
          <p className="text-muted text-sm">
            Mỗi nhóm viết mô tả cho thẻ của mình, các nhóm khác giơ thẻ đoán qua camera. Có phản biện &amp; bỏ phiếu.
          </p>
          <span className="inline-block mt-3 text-primary font-semibold text-sm">Vào phòng →</span>
        </a>
        <a href="/game/debate" className="block rounded-2xl border border-border bg-surface p-6 hover:shadow-md transition">
          <h2 className="font-display text-xl text-text mb-1">⚔️ Nghị Trường Quốc Tế</h2>
          <p className="text-muted text-sm">
            Vòng đấu loại trực tiếp — 8 nhóm, 3 vòng. Mỗi trận tranh luận 8 lượt, 6 nhóm còn lại bỏ phiếu chọn nhóm thắng.
          </p>
          <span className="inline-block mt-3 text-primary font-semibold text-sm">Vào phòng →</span>
        </a>
      </div>
    </div>
  );
}
