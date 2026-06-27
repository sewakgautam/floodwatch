import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { SESSION_COOKIE } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

const adminAllowlist = () =>
  (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

export async function POST(request) {
  const { idToken } = await request.json();
  if (!idToken) return Response.json({ error: 'Missing idToken' }, { status: 400 });

  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const adminDb = getAdminDb();

    const userRef = adminDb.collection('users').doc(decoded.uid);
    const userDoc = await userRef.get();
    const isAllowlistedAdmin = adminAllowlist().includes((decoded.email ?? '').toLowerCase());

    if (!userDoc.exists) {
      await userRef.set({
        email: decoded.email ?? null,
        name: decoded.name ?? null,
        role: isAllowlistedAdmin ? 'admin' : 'subscriber',
        createdAt: new Date(),
      });
    } else if (isAllowlistedAdmin && userDoc.data().role !== 'admin') {
      // Promote on every sign-in if the email is on the allowlist, in case it was added later.
      await userRef.update({ role: 'admin' });
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_MS / 1000,
      path: '/',
    });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 401 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return Response.json({ success: true });
}
