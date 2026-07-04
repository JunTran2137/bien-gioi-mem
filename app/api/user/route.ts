import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { MAX_MEMBERS_PER_GROUP, type User, type Group } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.uid) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE uid = ?').get(session.user.uid) as User | undefined;
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 404 });
  }
  let groupName: string | null = null;
  if (user.group_id) {
    const g = db.prepare('SELECT name FROM groups WHERE id = ?').get(user.group_id) as { name: string } | undefined;
    groupName = g?.name || null;
  }
  return NextResponse.json({
    authenticated: true,
    uid: user.uid,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    groupId: user.group_id,
    groupName,
    totalScore: user.total_score
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.uid) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: { groupId?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const newGroupId = body.groupId || null;
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE uid = ?').get(session.user.uid) as User | undefined;
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });

  if (newGroupId === user.group_id) {
    return NextResponse.json({ ok: true, groupId: newGroupId });
  }

  if (newGroupId) {
    const target = db.prepare('SELECT * FROM groups WHERE id = ?').get(newGroupId) as Group | undefined;
    if (!target) return NextResponse.json({ error: 'group_not_found' }, { status: 404 });
    if (target.member_count >= MAX_MEMBERS_PER_GROUP) {
      return NextResponse.json({ error: 'group_full', message: 'Nhóm đã đầy' }, { status: 400 });
    }
  }

  const tx = db.transaction(() => {
    if (user.group_id) {
      db.prepare('UPDATE groups SET member_count = MAX(member_count - 1, 0) WHERE id = ?').run(user.group_id);
    }
    if (newGroupId) {
      db.prepare('UPDATE groups SET member_count = member_count + 1 WHERE id = ?').run(newGroupId);
    }
    db.prepare('UPDATE users SET group_id = ? WHERE uid = ?').run(newGroupId, user.uid);
  });
  tx();

  let groupName: string | null = null;
  if (newGroupId) {
    const g = db.prepare('SELECT name FROM groups WHERE id = ?').get(newGroupId) as { name: string } | undefined;
    groupName = g?.name || null;
  }
  return NextResponse.json({ ok: true, groupId: newGroupId, groupName });
}
