import { getAdminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  try {
    await getAdminDb().collection('subscriptions').doc(id).delete();
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
