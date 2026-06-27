import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-session';
import { dispatchStationAlerts } from '@/lib/alert-dispatch';

export const dynamic = 'force-dynamic';

const VALID_LEVELS = ['NORMAL', 'WATCH', 'WARNING', 'CRITICAL', null];

/**
 * Sets a manual risk override for one station, fires the alert check immediately
 * (instead of waiting for the next /api/sync cycle), then clears the override —
 * it's a one-time forced notification, not a sticky state that survives a refresh.
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

    // Always clear afterward — the live computed risk (refreshed by the next /api/sync) takes over again.
    await stationRef.update({
      manualOverride: null,
      manualOverrideBy: FieldValue.delete(),
      manualOverrideAt: FieldValue.delete(),
    });

    return Response.json({ success: true, alertsSent });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
