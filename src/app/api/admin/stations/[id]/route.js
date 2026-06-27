import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-session';
import { dispatchStationAlerts } from '@/lib/alert-dispatch';

export const dynamic = 'force-dynamic';

const VALID_LEVELS = ['NORMAL', 'WATCH', 'WARNING', 'CRITICAL', null];

/**
 * Sets a manual risk override for one station and fires the alert check immediately
 * (instead of waiting for the next /api/sync cycle). The override is sticky — it
 * persists on the station doc (and wins over the computed risk everywhere: the public
 * map snapshot, the admin dashboard, future /api/sync runs) until an admin clears it
 * by setting manualOverride back to null.
 */
export async function PATCH(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { manualOverride } = await request.json();
  if (!VALID_LEVELS.includes(manualOverride)) {
    return Response.json({ error: `manualOverride must be one of ${VALID_LEVELS.join(', ')}` }, { status: 400 });
  }

  try {
    const adminDb = getAdminDb();
    const stationRef = adminDb.collection('stations').doc(id);
    const station = (await stationRef.get()).data();

    let alertsSent = 0;
    if (manualOverride) {
      alertsSent = await dispatchStationAlerts(adminDb, { stationId: id, stationName: station.name, effectiveRisk: manualOverride });
    }

    if (manualOverride) {
      await stationRef.update({ manualOverride, manualOverrideBy: admin.email, manualOverrideAt: FieldValue.serverTimestamp() });
    } else {
      await stationRef.update({ manualOverride: null, manualOverrideBy: FieldValue.delete(), manualOverrideAt: FieldValue.delete() });
    }

    // /api/map-data reads this cached snapshot, not the stations collection directly —
    // patch it in place so the public map reflects the override immediately instead of
    // waiting for the next /api/sync run (up to a day away on Vercel's free cron).
    const snapshotRef = adminDb.collection('config').doc('stationsSnapshot');
    const snapshotDoc = await snapshotRef.get();
    if (snapshotDoc.exists) {
      const snapshotStations = (snapshotDoc.data().stations ?? []).map((s) =>
        s.id === id ? { ...s, risk: manualOverride ?? station.computedRisk ?? 'NORMAL', status: 'ONLINE' } : s,
      );
      await snapshotRef.update({ stations: snapshotStations });
    }

    return Response.json({ success: true, alertsSent });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
