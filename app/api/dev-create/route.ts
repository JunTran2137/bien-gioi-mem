import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { generateRoomCode } from '@/lib/utils';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/dev-create?game=describe|debate — dev-only room creator, navigates to the room as host */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') redirect('/');
  const session = await auth();
  if (!session?.user?.uid) redirect('/dev-login');
  const { searchParams } = new URL(req.url);
  const game = searchParams.get('game') === 'debate' ? 'debate' : 'describe';
  const code = generateRoomCode();
  const db = getDb();
  db.prepare(`INSERT INTO quiz_sessions (id, room_code, status) VALUES (?, ?, 'waiting')`).run(code, code);
  redirect(`/game/${game}?room=${code}&host=1`);
}
