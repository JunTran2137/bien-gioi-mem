import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { MAX_GROUPS, MAX_MEMBERS_PER_GROUP, type Group } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const groups = db.prepare('SELECT * FROM groups ORDER BY created_at ASC').all() as Group[];
  // attach members preview
  const memberStmt = db.prepare('SELECT uid, name, avatar FROM users WHERE group_id = ? LIMIT 8');
  const withMembers = groups.map(g => ({
    ...g,
    capacity: MAX_MEMBERS_PER_GROUP,
    full: g.member_count >= MAX_MEMBERS_PER_GROUP,
    members: memberStmt.all(g.id)
  }));
  return NextResponse.json({
    groups: withMembers,
    canCreate: groups.length < MAX_GROUPS,
    maxGroups: MAX_GROUPS,
    maxMembers: MAX_MEMBERS_PER_GROUP
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.uid) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: { name?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const name = (body.name || '').trim().slice(0, 50);
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 });

  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) as c FROM groups').get() as { c: number }).c;
  if (count >= MAX_GROUPS) {
    return NextResponse.json({ error: 'max_groups', message: `Đã đạt giới hạn ${MAX_GROUPS} nhóm` }, { status: 400 });
  }
  const existing = db.prepare('SELECT id FROM groups WHERE name = ?').get(name);
  if (existing) return NextResponse.json({ error: 'name_taken', message: 'Tên nhóm đã tồn tại' }, { status: 400 });

  const id = generateId();
  db.prepare('INSERT INTO groups (id, name, total_score, member_count) VALUES (?, ?, 0, 0)').run(id, name);
  const g = db.prepare('SELECT * FROM groups WHERE id = ?').get(id) as Group;
  return NextResponse.json({ ok: true, group: { ...g, capacity: MAX_MEMBERS_PER_GROUP, full: false, members: [] } });
}
