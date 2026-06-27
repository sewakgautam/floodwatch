import { getAdminDb } from '@/lib/firebase-admin';
import { getSessionUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ subscriptions: [] });

  try {
    const snap = await getAdminDb().collection('subscriptions').where('uid', '==', user.uid).get();
    const subscriptions = snap.docs.map((doc) => {
      const s = doc.data();
      return { stationId: s.stationId, severity: s.severity };
    });
    return Response.json({ subscriptions });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
