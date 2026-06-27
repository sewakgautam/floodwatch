import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// If the cron pinger ever stops hitting /api/sync, this whole cached snapshot
// would otherwise sit there claiming everything is ONLINE forever.
const SNAPSHOT_STALE_AFTER_MS = 90 * 60 * 1000;

// Reads the single aggregated doc /api/sync writes, instead of querying every
// station document on every page load — that 300-reads-per-request pattern is
// what was burning through Firestore's free daily quota within a few hours.
export async function GET() {
  try {
    const doc = await getAdminDb().collection('config').doc('stationsSnapshot').get();
    if (!doc.exists) return Response.json({ stations: [], updatedAt: null });

    const data = doc.data();
    const updatedAt = data.updatedAt?.toDate?.() ?? null;
    const snapshotStale = !updatedAt || Date.now() - updatedAt.getTime() > SNAPSHOT_STALE_AFTER_MS;

    const stations = (data.stations ?? []).map((s) =>
      snapshotStale ? { ...s, risk: 'OFFLINE', status: 'OFFLINE' } : s,
    );

    return Response.json({ stations, updatedAt: updatedAt?.toISOString() ?? null });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
