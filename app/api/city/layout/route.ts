/**
 * Server-side city layout endpoint.
 * Precomputes the entire city geometry (building positions, road segments,
 * tree/lamp placements) on the server so the client doesn't need to spend
 * main-thread CPU on RNG packing + collision tests.
 *
 * Cache-Control: layout is deterministic per tier, so we mark it
 * `public, max-age=31536000, immutable`. The browser and any HTTP cache
 * upstream (CDN, reverse proxy) can serve it indefinitely. Bump the seed
 * param to invalidate.
 */
import { NextRequest, NextResponse } from 'next/server';
import { computeCityLayout, Tier } from '@/lib/three/cityLayout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = false;

function asTier(v: string | null): Tier {
  if (v === 'high' || v === 'mid' || v === 'low' || v === 'fallback') return v;
  return 'mid';
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tier = asTier(url.searchParams.get('tier'));
  const seedParam = url.searchParams.get('seed');
  const seed = seedParam ? Number(seedParam) : undefined;

  const layout = computeCityLayout(tier, Number.isFinite(seed) ? seed : undefined);

  return NextResponse.json(layout, {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}
