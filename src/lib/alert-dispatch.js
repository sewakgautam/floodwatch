import { sendMail } from './mailer';
import { alertEmail, deescalationEmail, emailSubject } from './email-templates';
import { SEVERITY_RANK } from './risk';

/**
 * Checks one station's subscribers against its current effective risk and sends
 * either an escalation alert (crossed at/above their threshold) or a de-escalation
 * "back to normal" notice (dropped back below it, having previously been at/above).
 * Used both by the bulk /api/sync cycle and by the admin manual-override endpoint.
 */
export async function dispatchStationAlerts(adminDb, { stationId, stationName, effectiveRisk, waterLevel, warningLevel, dangerLevel, rainfall, trend }) {
  const subsSnap = await adminDb.collection('subscriptions').where('stationId', '==', stationId).get();

  let sent = 0;
  for (const doc of subsSnap.docs) {
    const sub = doc.data();
    if (sub.lastNotifiedRisk === effectiveRisk) continue; // no change since last notification

    const wasAboveThreshold = SEVERITY_RANK[sub.lastNotifiedRisk ?? 'NORMAL'] >= SEVERITY_RANK[sub.severity];
    const isAboveThreshold = SEVERITY_RANK[effectiveRisk] >= SEVERITY_RANK[sub.severity];
    await doc.ref.update({ lastNotifiedRisk: effectiveRisk });

    const lang = sub.lang === 'ne' ? 'ne' : 'en';
    try {
      if (isAboveThreshold) {
        await sendMail({
          to: sub.email,
          subject: emailSubject({ stationName, risk: effectiveRisk, lang }),
          html: alertEmail({ stationName, risk: effectiveRisk, waterLevel, warningLevel, dangerLevel, rainfall, trend, lang }),
        });
        console.log(`[mail] alert sent to ${sub.email} for ${stationName} (${effectiveRisk})`);
        sent++;
      } else if (wasAboveThreshold) {
        await sendMail({
          to: sub.email,
          subject: emailSubject({ stationName, risk: effectiveRisk, deescalated: true, lang }),
          html: deescalationEmail({ stationName, risk: effectiveRisk, lang }),
        });
        console.log(`[mail] de-escalation sent to ${sub.email} for ${stationName} (${effectiveRisk})`);
        sent++;
      }
    } catch (err) {
      console.error(`Alert email to ${sub.email} failed:`, err.message);
    }
  }
  return sent;
}
