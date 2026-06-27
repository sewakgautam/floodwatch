import { getAdminDb } from '@/lib/firebase-admin';
import { fetchDhmStations } from '@/lib/dhm-fetch';
import { computeRisk, SEVERITY_RANK } from '@/lib/risk';
import { sendMail } from '@/lib/mailer';
import { alertEmail, deescalationEmail, emailSubject } from '@/lib/email-templates';
import { appendHistory, estimateRise } from '@/lib/rise-rate';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// A station is considered offline if it hasn't synced in 3 sync cycles (~90 min).
const OFFLINE_AFTER_MS = 90 * 60 * 1000;

// If the current rise rate would hit dangerLevel within this many hours, escalate
// to WARNING now instead of waiting for the absolute threshold to actually be crossed.
const PREDICTIVE_ESCALATION_HOURS = 2;

// Triggered by an external cron pinger (cron-job.org) every 15-30 min,
// since Vercel's free tier only runs its own Cron Jobs once a day.
export async function GET(request) {
  // Vercel's own Cron Jobs send the CRON_SECRET env var as `Authorization: Bearer <secret>`
  // automatically; external pingers (cron-job.org) instead pass it as a ?secret= query param.
  const authHeader = request.headers.get('authorization');
  const secret = authHeader === `Bearer ${process.env.CRON_SECRET}` ? process.env.CRON_SECRET : request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let stations;
  try {
    stations = await fetchDhmStations();
  } catch (err) {
    return Response.json({ error: `DHM fetch failed: ${err.message}` }, { status: 502 });
  }

  try {
    const adminDb = getAdminDb();

    // Read existing manualOverride + rise history once, so an admin's override (which this
    // sync's merge write never touches) is still factored into alert dispatch below, and so
    // we can compute each station's real observed rise rate from its own past readings.
    const existingSnap = await adminDb.collection('stations').get();
    const manualOverrideById = new Map(
      existingSnap.docs.filter((d) => d.data().manualOverride != null).map((d) => [d.id, d.data().manualOverride]),
    );
    const historyById = new Map(existingSnap.docs.map((d) => [d.id, d.data().history ?? []]));

    // One read of all subscriptions, grouped by station — far cheaper than querying per station.
    const subsSnap = await adminDb.collection('subscriptions').get();
    const subsByStation = new Map();
    for (const doc of subsSnap.docs) {
      const sub = doc.data();
      if (!subsByStation.has(sub.stationId)) subsByStation.set(sub.stationId, []);
      subsByStation.get(sub.stationId).push({ id: doc.id, ...sub });
    }

    const batch = adminDb.batch();
    const subscriptionUpdates = [];
    const emailJobs = [];
    const snapshotStations = []; // for the single aggregated doc the public map reads
    const now = new Date();
    let saved = 0;

    for (const s of stations) {
      if (!s.lat || !s.lon) continue;

      const id = `DHM-${s.dhmId}`;
      const location = [s.basin ? `${s.basin} Basin` : '', s.district, 'Nepal'].filter(Boolean).join(', ');
      const finalRainfall = s.rainfall?.mm6h ?? s.rainfall?.mm24h ?? null;

      let computedRisk = computeRisk({
        dhmStatus: s.dhmStatus,
        waterLevel: s.waterLevel,
        warningLevel: s.warningLevel,
        dangerLevel: s.dangerLevel,
        rainfallWarning: s.rainfall?.rainfallWarning ?? false,
        rainfallDanger: s.rainfall?.rainfallDanger ?? false,
      });

      // Real observed rise rate from this station's own recent readings — escalate
      // before the absolute threshold is actually crossed if the trend predicts it soon.
      const newHistory = s.waterLevel != null ? appendHistory(historyById.get(id), s.waterLevel, now.getTime()) : (historyById.get(id) ?? []);
      const rise = s.waterLevel != null ? estimateRise(newHistory, s.dangerLevel) : null;
      const rapidRise = rise?.hoursToDanger != null && rise.hoursToDanger <= PREDICTIVE_ESCALATION_HOURS;
      if (rapidRise && SEVERITY_RANK[computedRisk] < SEVERITY_RANK.WARNING) computedRisk = 'WARNING';

      // merge: true so an admin's manualOverride (set via /api/admin/stations) survives the next sync.
      batch.set(adminDb.collection('stations').doc(id), {
        id,
        seriesId: s.seriesId,
        name: s.name,
        location,
        latitude: s.lat,
        longitude: s.lon,
        elevation: s.elevation,
        waterLevel: s.waterLevel,
        warningLevel: s.warningLevel,
        dangerLevel: s.dangerLevel,
        trend: s.trend,
        trendRaw: s.trendRaw,
        dhmStatus: s.dhmStatus || null,
        rainfallMm6h: s.rainfall?.mm6h ?? null,
        rainfallMm24h: s.rainfall?.mm24h ?? null,
        rainfall: finalRainfall,
        computedRisk,
        history: newHistory,
        riseRateMPerHour: rise?.rateMPerHour ?? null,
        hoursToDanger: rise?.hoursToDanger ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      saved++;

      // Manual override (set by an admin) always wins over the freshly computed risk.
      const effectiveRisk = manualOverrideById.get(id) ?? computedRisk;

      snapshotStations.push({
        id,
        name: s.name,
        location,
        latitude: s.lat,
        longitude: s.lon,
        elevation: s.elevation,
        trend: s.trend,
        risk: effectiveRisk,
        rapidRise,
        riseRateMPerHour: rise?.rateMPerHour ?? null,
        hoursToDanger: rise?.hoursToDanger ?? null,
        status: 'ONLINE',
        riverLevel: s.waterLevel != null ? { levelM: s.waterLevel } : null,
        rainfall: finalRainfall != null ? { valueMm: finalRainfall } : null,
        thresholds: { warningRiver: s.warningLevel, criticalRiver: s.dangerLevel },
        lastSeenAt: now.toISOString(),
      });

      for (const sub of subsByStation.get(id) ?? []) {
        if (sub.lastNotifiedRisk === effectiveRisk) continue; // no change since last cycle

        const wasAboveThreshold = SEVERITY_RANK[sub.lastNotifiedRisk ?? 'NORMAL'] >= SEVERITY_RANK[sub.severity];
        const isAboveThreshold = SEVERITY_RANK[effectiveRisk] >= SEVERITY_RANK[sub.severity];
        subscriptionUpdates.push({ id: sub.id, lastNotifiedRisk: effectiveRisk });
        const lang = sub.lang === 'ne' ? 'ne' : 'en';

        if (isAboveThreshold) {
          emailJobs.push(
            sendMail({
              to: sub.email,
              subject: emailSubject({ stationName: s.name, risk: effectiveRisk, lang }),
              html: alertEmail({ stationName: s.name, risk: effectiveRisk, waterLevel: s.waterLevel, warningLevel: s.warningLevel, dangerLevel: s.dangerLevel, rainfall: finalRainfall, trend: s.trend, lang, rapidRise, hoursToDanger: rise?.hoursToDanger }),
            })
              .then(() => console.log(`[mail] alert sent to ${sub.email} for ${s.name} (${effectiveRisk})`))
              .catch((err) => console.error(`Alert email to ${sub.email} failed:`, err.message)),
          );
        } else if (wasAboveThreshold) {
          emailJobs.push(
            sendMail({
              to: sub.email,
              subject: emailSubject({ stationName: s.name, risk: effectiveRisk, deescalated: true, lang }),
              html: deescalationEmail({ stationName: s.name, risk: effectiveRisk, lang }),
            })
              .then(() => console.log(`[mail] de-escalation sent to ${sub.email} for ${s.name} (${effectiveRisk})`))
              .catch((err) => console.error(`De-escalation email to ${sub.email} failed:`, err.message)),
          );
        }
      }
    }

    // Mark previously-online stations that didn't appear in this fetch as OFFLINE in the snapshot.
    const seenIds = new Set(snapshotStations.map((s) => s.id));
    for (const doc of existingSnap.docs) {
      if (seenIds.has(doc.id)) continue;
      const d = doc.data();
      const lastSeen = d.updatedAt?.toDate?.();
      if (lastSeen && Date.now() - lastSeen.getTime() <= OFFLINE_AFTER_MS) continue; // still within grace period, skip
      snapshotStations.push({
        id: doc.id, name: d.name, location: d.location, latitude: d.latitude, longitude: d.longitude,
        elevation: d.elevation, trend: d.trend, risk: 'OFFLINE', status: 'OFFLINE',
        riverLevel: null, rainfall: null, thresholds: { warningRiver: d.warningLevel, criticalRiver: d.dangerLevel },
        lastSeenAt: lastSeen ? lastSeen.toISOString() : null,
      });
    }

    // Single aggregated doc the public map reads — collapses ~300 document reads per
    // page load down to 1, which is what blew through Firestore's free daily quota.
    batch.set(adminDb.collection('config').doc('stationsSnapshot'), {
      stations: snapshotStations,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    if (subscriptionUpdates.length > 0) {
      const subBatch = adminDb.batch();
      for (const u of subscriptionUpdates) {
        subBatch.update(adminDb.collection('subscriptions').doc(u.id), { lastNotifiedRisk: u.lastNotifiedRisk });
      }
      await subBatch.commit();
    }
    await Promise.allSettled(emailJobs);

    return Response.json({ success: true, saved, total: stations.length, alertsSent: emailJobs.length });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
