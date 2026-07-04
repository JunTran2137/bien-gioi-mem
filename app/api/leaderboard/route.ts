import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface GroupRow {
  id: string;
  name: string;
  total_score: number;
  member_count: number;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = (url.searchParams.get('period') || 'all') as 'all' | 'today' | 'week' | 'game1' | 'game2';
  const db = getDb();

  // Per-game leaderboards.
  //   game1 = Quiz (Đại sứ tri thức) → total quiz points won per group.
  //   game2 = Tranh luận (Nghị trường) → total votes won per group.
  if (period === 'game1' || period === 'game2') {
    let rows: Array<{ id: string; name: string; member_count: number; total_score: number }>;
    let totalGames: number;
    if (period === 'game1') {
      rows = db
        .prepare(
          `SELECT u.group_id as id, g.name as name, g.member_count as member_count,
                  SUM(qs.score) as total_score
           FROM quiz_scores qs
           JOIN quiz_sessions s ON s.id = qs.session_id
           JOIN users u ON u.uid = qs.uid
           JOIN groups g ON g.id = u.group_id
           WHERE s.status = 'finished'
           GROUP BY u.group_id
           ORDER BY total_score DESC`
        )
        .all() as typeof rows;
      totalGames = (db.prepare("SELECT COUNT(*) as c FROM quiz_sessions WHERE status='finished'").get() as { c: number }).c;
    } else {
      rows = db
        .prepare(
          `SELECT g.id as id, g.name as name, g.member_count as member_count,
                  COUNT(dv.voted_group) as total_score
           FROM debate_votes dv
           JOIN groups g ON g.id = dv.voted_group
           GROUP BY g.id
           ORDER BY total_score DESC`
        )
        .all() as typeof rows;
      totalGames = (db.prepare("SELECT COUNT(*) as c FROM debate_sessions WHERE status='finished'").get() as { c: number }).c;
    }
    return NextResponse.json({
      period,
      groups: rows.map((g, i) => ({
        rank: i + 1,
        id: g.id,
        name: g.name,
        total_score: g.total_score || 0,
        member_count: g.member_count,
        avg: g.member_count > 0 ? Math.round((g.total_score || 0) / g.member_count) : 0
      })),
      totalGames
    });
  }

  if (period === 'all') {
    const groups = db
      .prepare('SELECT id, name, total_score, member_count FROM groups ORDER BY total_score DESC')
      .all() as GroupRow[];
    const totalGames = (db
      .prepare(`SELECT
        (SELECT COUNT(*) FROM quiz_sessions WHERE status='finished') +
        (SELECT COUNT(*) FROM debate_sessions WHERE status='finished') as c`)
      .get() as { c: number }).c;
    return NextResponse.json({
      period,
      groups: groups.map((g, i) => ({
        rank: i + 1,
        ...g,
        avg: g.member_count > 0 ? Math.round(g.total_score / g.member_count) : 0
      })),
      totalGames
    });
  }

  // today / week — aggregate scoreUpdates from quiz_scores joined to sessions
  const since = period === 'today' ? "datetime('now', '-1 day')" : "datetime('now', '-7 day')";
  const rows = db
    .prepare(
      `SELECT u.group_id as id, g.name as name, g.member_count as member_count,
              SUM(qs.score) as total_score
       FROM quiz_scores qs
       JOIN quiz_sessions s ON s.id = qs.session_id
       JOIN users u ON u.uid = qs.uid
       JOIN groups g ON g.id = u.group_id
       WHERE s.status = 'finished' AND s.ended_at > ${since}
       GROUP BY u.group_id
       ORDER BY total_score DESC`
    )
    .all() as Array<{ id: string; name: string; member_count: number; total_score: number }>;

  return NextResponse.json({
    period,
    groups: rows.map((g, i) => ({
      rank: i + 1,
      id: g.id,
      name: g.name,
      total_score: g.total_score || 0,
      member_count: g.member_count,
      avg: g.member_count > 0 ? Math.round((g.total_score || 0) / g.member_count) : 0
    }))
  });
}
