// Sends mail via Microsoft Graph API using an app-only (client credentials) token —
// no SMTP, no nodemailer. Microsoft 365 mailboxes with Conditional Access/Security
// Defaults block plain-password SMTP entirely, so this is the supported path.

let cachedToken = null; // { accessToken, expiresAt }

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const tenantId = process.env.GRAPH_TENANT_ID;
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GRAPH_CLIENT_ID,
      client_secret: process.env.GRAPH_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Failed to get Graph access token');

  cachedToken = { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.accessToken;
}

/** Best-effort send — callers should not let a failed email block the main request. */
export async function sendMail({ to, subject, html }) {
  const token = await getAccessToken();
  const fromMailbox = process.env.ALERT_FROM_EMAIL;

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${fromMailbox}/sendMail`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: html },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: false,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Graph sendMail failed: ${res.status} ${errBody}`);
  }
}
