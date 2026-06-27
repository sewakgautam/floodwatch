import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from './firebase-admin';

const SESSION_COOKIE = 'fw_session';

export { SESSION_COOKIE };

/** Reads the session cookie and returns { uid, email, role } or null. Never throws. */
export async function getSessionUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(session, true);
    const userDoc = await getAdminDb().collection('users').doc(decoded.uid).get();
    const role = userDoc.exists ? userDoc.data().role : 'subscriber';
    return { uid: decoded.uid, email: decoded.email, role };
  } catch {
    return null;
  }
}

/** For use inside API route handlers. Returns the admin user, or null if unauthorized. */
export async function requireAdmin() {
  const user = await getSessionUser();
  return user?.role === 'admin' ? user : null;
}
