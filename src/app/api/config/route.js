import { getAdminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

const DEFAULT_VIEW = { lat: 28.3949, lon: 84.124, zoom: 7 };

export async function GET() {
  try {
    const doc = await getAdminDb().collection('config').doc('mapView').get();
    return Response.json({ mapView: doc.exists ? doc.data() : DEFAULT_VIEW });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { lat, lon, zoom } = await request.json();
  if (typeof lat !== 'number' || typeof lon !== 'number' || typeof zoom !== 'number') {
    return Response.json({ error: 'lat, lon, zoom must be numbers' }, { status: 400 });
  }

  try {
    await getAdminDb().collection('config').doc('mapView').set({ lat, lon, zoom });
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
