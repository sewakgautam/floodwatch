import { getAdminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const snap = await getAdminDb().collection('subscriptions').orderBy('createdAt', 'desc').get();
    const subscriptions = snap.docs.map((doc) => {
      const s = doc.data();
      return {
        id: doc.id,
        email: s.email,
        stationId: s.stationId,
        stationName: s.stationName,
        severity: s.severity,
        createdAt: s.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });
    return Response.json({ subscriptions });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
