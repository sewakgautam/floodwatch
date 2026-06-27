// One-time backfill: seed real historical hourly readings from DHM's per-station
// AJAX endpoint, so rise-rate detection has real data immediately instead of
// waiting for our own regular syncs to accumulate it over hours/days.
// Run once manually: node backfill-history.mjs
import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }),
);

const app = initializeApp({
  credential: cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore(app);

const MAX_HISTORY = 8;
const today = new Date().toISOString().slice(0, 10);

function toGauge(val, elevation) {
  if (val == null) return null;
  if (elevation != null && val > elevation * 0.5) return Math.round((val - elevation) * 1000) / 1000;
  if (elevation == null && val > 20) return null;
  return val;
}

async function fetchHistory(seriesId) {
  const res = await fetch('https://dhm.gov.np/site/getRiverWatchBySeriesId', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' },
    body: `csrf_test_name=x&date=${today}&period=2&seriesid=${seriesId}`,
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json();
  if (json.status !== 'success') return [];

  const rows = [...json.data.table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
  const readings = [];
  for (const [, rowHtml] of rows) {
    const cells = [...rowHtml.matchAll(/<td>\s*([\s\S]*?)\s*<\/td>/g)].map((m) => m[1].trim());
    if (cells.length < 4) continue;
    const dateStr = cells[0].replace(/^\w+,\s*/, '').replace(/\s*,\s*/, ' '); // "Jun 26, 2026 11:00 PM"
    const t = new Date(dateStr).getTime();
    const avg = parseFloat(cells[3]);
    if (Number.isFinite(t) && Number.isFinite(avg)) readings.push({ t, avg });
  }
  readings.sort((a, b) => a.t - b.t);
  return readings;
}

async function main() {
  const snap = await db.collection('stations').where('seriesId', '!=', null).get();
  console.log(`Found ${snap.size} stations with a seriesId to backfill.`);

  let backfilled = 0;
  let skipped = 0;
  for (const doc of snap.docs) {
    const s = doc.data();
    if (s.waterLevel == null) { skipped++; continue; } // no current reading either, nothing to calibrate against

    try {
      const readings = await fetchHistory(s.seriesId);
      const recent = readings.slice(-MAX_HISTORY).map((r) => ({ t: r.t, level: toGauge(r.avg, s.elevation) })).filter((r) => r.level != null);

      if (recent.length >= 2) {
        await doc.ref.update({ history: recent });
        backfilled++;
        console.log(`[${backfilled}] ${s.name}: seeded ${recent.length} historical points`);
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`Failed for ${s.name} (seriesId ${s.seriesId}):`, err.message);
      skipped++;
    }

    await new Promise((r) => setTimeout(r, 400)); // be polite to DHM's server
  }

  console.log(`\nDone. Backfilled: ${backfilled}, skipped: ${skipped}`);
}

main();
