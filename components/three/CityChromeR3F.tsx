'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { AuthButton } from '../AuthButton';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Thành phố',
  '/theory': '📚 Thư viện',
  '/flashcards': '🎓 Học viện · Flashcard',
  '/leaderboard': '🏆 Đài vinh danh',
  '/game': '⚔️ Đấu trường',
  '/game/quiz': '⚡ Quiz Arena',
  '/game/debate': '🎭 Nghị trường',
  '/townhall': '🏛️ Tòa thị chính'
};

/** HTML chrome floating on top of the 3D canvas. Always accessible. */
export function CityChromeR3F() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [muted, setMuted] = useState(true);

  const title = ROUTE_TITLES[pathname] || pathname;
  const isHome = pathname === '/';

  return (
    <>
      {/* Top bar */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between p-4"
      >
        <div className="pointer-events-auto flex items-center gap-3">
          {isHome && (
            <Link
              href="/"
              aria-label="Trang chủ"
              className="rounded-2xl border border-white/40 bg-white/80 px-4 py-3 font-display text-base font-bold text-text backdrop-blur-md transition hover:bg-white"
            >
              🌏 Biên Giới Mềm
            </Link>
          )}
          {!isHome && (
            <button
              onClick={() => {
                window.dispatchEvent(new Event('world-loading'));
                requestAnimationFrame(() => router.push('/'));
              }}
              className="flex items-center gap-1.5 rounded-2xl border border-white/40 bg-white/80 px-4 py-3.5 text-sm font-medium text-text backdrop-blur-md transition hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Về thành phố
            </button>
          )}
          {!isHome && (
            <div className="hidden rounded-2xl border border-white/40 bg-white/70 px-4 py-3.5 text-sm text-muted backdrop-blur-md md:block">
              {title}
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => setMuted(!muted)}
            aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="rounded-full border border-white/40 bg-white/80 p-2 text-text backdrop-blur-md transition hover:bg-white"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <div className="rounded-2xl border border-white/40 bg-white/80 px-2 py-1 backdrop-blur-md">
            <AuthButton />
          </div>
        </div>
      </div>

      {/* Bottom hint (home only) */}
      {isHome && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center">
          <div className="rounded-full border border-white/40 bg-white/80 px-4 py-2 text-xs text-muted backdrop-blur-md">
            Click vào công trình để khám phá · Kéo chuột để xoay · Scroll để thu phóng
          </div>
        </div>
      )}
    </>
  );
}
