'use client';

import { useEffect, useState } from 'react';

export type LeaderboardPeriod = 'all' | 'today' | 'week' | 'game1' | 'game2';

export interface LeaderboardGroup {
  rank: number;
  id: string;
  name: string;
  total_score: number;
  member_count: number;
  avg: number;
}

export function useLeaderboardData(period: LeaderboardPeriod = 'all') {
  const [groups, setGroups] = useState<LeaderboardGroup[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/leaderboard?period=${period}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Lỗi tải xếp hạng');
        const data = await res.json();
        if (cancelled) return;
        setGroups(data.groups || []);
        setTotalGames(data.totalGames || 0);
        setError(null);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Lỗi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 8000);
    return () => { cancelled = true; clearInterval(id); };
  }, [period]);

  return { groups, totalGames, loading, error };
}
