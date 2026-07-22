import { Suspense } from 'react';
import { DescribeRoom } from '@/components/DescribeRoom';

export const metadata = { title: 'Luận Giải' };

export default function DescribeGamePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-muted">Đang vào phòng…</div>}>
      <DescribeRoom />
    </Suspense>
  );
}
