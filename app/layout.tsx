import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google';
import { SessionProvider } from '@/components/SessionProvider';
import { Toaster } from '@/components/ui/toast';
import { AuthGate } from '@/components/AuthGate';
import { WorldShell } from '@/components/three/WorldShell';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-display',
  display: 'swap'
});
const bevn = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap'
});
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-mono',
  display: 'swap'
});

export const metadata: Metadata = {
  title: {
    default: 'Biên Giới Mềm — Việt Nam hội nhập và độc lập',
    template: '%s · Biên Giới Mềm'
  },
  description:
    'Khám phá cách Việt Nam hội nhập thế giới mà vẫn giữ vững bản sắc. Web app giáo dục tương tác về biên giới mềm, hội nhập kinh tế quốc tế.',
  keywords: ['biên giới mềm', 'hội nhập kinh tế', 'Việt Nam', 'WTO', 'ASEAN', 'CPTPP', 'EVFTA'],
  openGraph: {
    title: 'Biên Giới Mềm — Việt Nam hội nhập và độc lập',
    description: 'Học, ôn tập và thi đấu cùng bạn bè về chủ đề hội nhập quốc tế.',
    type: 'website'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F0F7F4'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${playfair.variable} ${bevn.variable} ${jetbrains.variable}`}>
      <body>
        <SessionProvider>
          <WorldShell>{children}</WorldShell>
          <Toaster />
          <AuthGate />
        </SessionProvider>
      </body>
    </html>
  );
}
