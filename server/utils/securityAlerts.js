// server/utils/securityAlerts.js
const sendEmail = require('./email');

// Anti-spam en memoria (si reinicias servidor, se limpia)
const lastAlertAt = new Map(); // key -> timestamp

function alertsEnabled() {
  if (process.env.SECURITY_ALERTS_ENABLED === 'false') return false;
  if (process.env.NODE_ENV !== 'production') return false; // dev-safe
  return true;
}

function canSendAlert(key, cooldownMs = 10 * 60 * 1000) {
  const now = Date.now();
  const last = lastAlertAt.get(key) || 0;
  if (now - last < cooldownMs) return false;
  lastAlertAt.set(key, now);
  return true;
}

async function alertBruteForceBlock({
  to,
  action,
  ip,
  email,
  worst,
  counts,
  keys,
  cooldownMs,
}) {
  const alertKey = `bf:${action}:${ip}:${email || '-'}`;
  if (!canSendAlert(alertKey, cooldownMs)) return;

  const subject = `🚨 Brute force bloqueado (${action}) - IP ${ip}`;

  const text =
`Se ha bloqueado un brute force.

Action: ${action}
IP: ${ip}
Email: ${email || 'N/A'}
Worst: ${worst}

Keys:
${(keys || []).join('\n')}

Counts:
${JSON.stringify(counts, null, 2)}
`;

  const html = `
  <h2>🚨 Brute force bloqueado</h2>
  <ul>
    <li><b>Action:</b> ${action}</li>
    <li><b>IP:</b> ${ip}</li>
    <li><b>Email:</b> ${email || 'N/A'}</li>
    <li><b>Worst:</b> ${worst}</li>
  </ul>
  <h3>Keys</h3>
  <pre>${(keys || []).join('\n')}</pre>
  <h3>Counts</h3>
  <pre>${JSON.stringify(counts, null, 2)}</pre>
  `;
if (!alertsEnabled()) {
  console.log('🧪 [DEV] Alerta omitida (alerts disabled / not production)');
  return;
}

  await sendEmail({ to, subject, text, html });
}

module.exports = { alertBruteForceBlock };
