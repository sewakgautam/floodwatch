import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';
import { getSessionUser } from '@/lib/auth-session';
import { sendMail } from '@/lib/mailer';
import { subscriptionConfirmedEmail } from '@/lib/email-templates';

export const dynamic = 'force-dynamic';

const VALID_SEVERITIES = ['WATCH', 'WARNING', 'CRITICAL'];

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });

  const { stationId, severity, lang } = await request.json();
  if (!stationId || !VALID_SEVERITIES.includes(severity)) {
    return Response.json({ error: `severity must be one of ${VALID_SEVERITIES.join(', ')}` }, { status: 400 });
  }
  const emailLang = lang === 'ne' ? 'ne' : 'en';

  try {
    const adminDb = getAdminDb();
    const stationDoc = await adminDb.collection('stations').doc(stationId).get();
    if (!stationDoc.exists) return Response.json({ error: 'Station not found' }, { status: 404 });

    const stationName = stationDoc.data().name;
    const id = `${user.uid}_${stationId}`;
    await adminDb.collection('subscriptions').doc(id).set({
      uid: user.uid,
      email: user.email,
      stationId,
      stationName,
      severity,
      lang: emailLang,
      lastNotifiedRisk: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Best-effort — a failed confirmation email shouldn't fail the subscribe request.
    sendMail({
      to: user.email,
      subject: `Subscribed to ${stationName} flood alerts`,
      html: subscriptionConfirmedEmail({ stationName, severity, lang: emailLang }),
    })
      .then(() => console.log(`[mail] confirmation sent to ${user.email} for ${stationName}`))
      .catch((err) => console.error('Confirmation email failed:', err.message));

    return Response.json({ success: true, message: `Subscribed to ${severity}+ alerts for ${stationName}` });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
