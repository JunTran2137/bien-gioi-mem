import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="text-center max-w-md">
        <svg viewBox="0 0 200 200" className="mx-auto h-48 w-48 mb-6" aria-hidden="true">
          <defs>
            <radialGradient id="globeBg" cx="40%" cy="40%">
              <stop offset="0%" stopColor="#E8F5F0" />
              <stop offset="100%" stopColor="#2E8B6B" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="80" fill="url(#globeBg)" stroke="#1A2E25" strokeWidth="2" />
          <ellipse cx="100" cy="100" rx="80" ry="30" fill="none" stroke="#1A2E25" strokeWidth="1" opacity="0.4" />
          <ellipse cx="100" cy="100" rx="30" ry="80" fill="none" stroke="#1A2E25" strokeWidth="1" opacity="0.4" />
          <path d="M40 80 Q70 65, 90 85 T140 90 Q160 80, 170 95" fill="none" stroke="#1A2E25" strokeWidth="2" opacity="0.6" />
          <path d="M30 130 Q60 115, 85 130 T130 135" fill="none" stroke="#1A2E25" strokeWidth="2" opacity="0.6" />
          <circle cx="155" cy="55" r="6" fill="#F4A261" />
          <text x="160" y="60" fontSize="6" fill="#1A2E25">?</text>
        </svg>
        <h1 className="font-display text-4xl font-bold text-text mb-2">404</h1>
        <p className="text-muted mb-6">
          Trang này không tồn tại trong bản đồ thế giới 🌍
        </p>
        <Button asChild>
          <Link href="/">Về Trang chủ</Link>
        </Button>
      </div>
    </div>
  );
}
