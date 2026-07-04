import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateRoomCode } from '@/lib/utils';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await auth();
  if (!session?.user?.uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const code = generateRoomCode();
  const db = getDb();
  db.prepare(
    `INSERT INTO quiz_sessions (id, room_code, status) VALUES (?, ?, 'waiting')`
  ).run(code, code);
  return NextResponse.json({ ok: true, roomCode: code });
}
