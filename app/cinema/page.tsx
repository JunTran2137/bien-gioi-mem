import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rạp Chiếu Phim',
  description: 'Xem 3 bộ phim tài liệu về hội nhập kinh tế, EVFTA và biên giới mềm trong không gian rạp chiếu phim 3D.',
};

export default function CinemaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-text mb-3">🎬 Rạp Chiếu Phim</h1>
      <p className="text-muted">
        Xem 3 bộ phim tài liệu về hội nhập kinh tế, EVFTA và biên giới mềm. Vào rạp 3D, chọn poster phim trên màn
        hình để bắt đầu chiếu.
      </p>
    </div>
  );
}
