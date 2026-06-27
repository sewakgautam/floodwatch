import { getAdminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const snap = await getAdminDb().collection('stations').orderBy('name', 'asc').get();
    const stations = snap.docs.map((doc) => {
      const s = doc.data();
      return {
        id: s.id,
        name: s.name,
        location: s.location,
        dhmStatus: s.dhmStatus,
        waterLevel: s.waterLevel,
        warningLevel: s.warningLevel,
        dangerLevel: s.dangerLevel,
        rainfall: s.rainfall,
        computedRisk: s.computedRisk ?? s.risk ?? 'NORMAL',
        manualOverride: s.manualOverride ?? null,
        riseRateMPerHour: s.riseRateMPerHour ?? null,
        hoursToDanger: s.hoursToDanger ?? null,
        updatedAt: s.updatedAt?.toDate?.()?.toISOString() ?? null,
      };
    });
    return Response.json({ stations });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
