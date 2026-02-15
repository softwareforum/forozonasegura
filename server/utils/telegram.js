const logger = require('./logger');

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const MAX_TELEGRAM_FILE_BYTES = 10 * 1024 * 1024;
const ROLE_LABELS = {
  inquilino: 'inquilino',
  facilita_espacio: 'quien facilita el espacio'
};

const isConfigured = () =>
  !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID;

const truncate = (value, max = 500) => {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

const sendTelegramRequest = async (method, payload) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  const url = `${TELEGRAM_API_BASE}/bot${token}/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    body: payload
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram API ${method} failed: ${response.status} ${body}`);
  }
  return response.json();
};

const sendTelegramMessage = async (text) => {
  if (!isConfigured()) return;
  const payload = new URLSearchParams({
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text,
    disable_web_page_preview: 'true'
  });
  await sendTelegramRequest('sendMessage', payload);
};

const sendTelegramFile = async (attachment) => {
  if (!isConfigured()) return;
  if (attachment.size > MAX_TELEGRAM_FILE_BYTES) {
    return false;
  }

  const method = attachment.mimeType.startsWith('image/')
    ? 'sendPhoto'
    : attachment.mimeType.startsWith('video/')
      ? 'sendVideo'
      : 'sendDocument';
  const field = method === 'sendPhoto' ? 'photo' : method === 'sendVideo' ? 'video' : 'document';

  const form = new FormData();
  form.append('chat_id', process.env.TELEGRAM_CHAT_ID);
  form.append(field, attachment.buffer, attachment.originalName);
  form.append('caption', truncate(`Adjunto reporte: ${attachment.originalName}`, 900));

  await sendTelegramRequest(method, form);
  return true;
};

const sendReportTelegramNotification = async ({ post, report, attachments = [], postUrl }) => {
  if (!isConfigured()) return;

  const totalSize = attachments.reduce((acc, item) => acc + (item.size || 0), 0);
  const province = post?.location?.provincia || post?.community || 'Sin provincia';
  const reporterContact = [report.reporter?.email, report.reporter?.phone].filter(Boolean).join(' | ') || 'Sin contacto';

  const summary = [
    'Nuevo reporte recibido',
    `Post: ${truncate(post?.title || 'Sin titulo', 120)}`,
    `PostId: ${post?._id || report?.postId || 'N/A'}`,
    `Provincia: ${province}`,
    `Reporta como: ${ROLE_LABELS[report.role] || report.role || 'inquilino'}`,
    `Fecha: ${new Date(report.createdAt || Date.now()).toISOString()}`,
    `Contacto: ${truncate(reporterContact, 120)}`,
    `Adjuntos: ${attachments.length} (${(totalSize / (1024 * 1024)).toFixed(2)} MB)`,
    `Mensaje: ${truncate(report.message, 800)}`,
    postUrl ? `Link: ${postUrl}` : null
  ].filter(Boolean).join('\n');

  await sendTelegramMessage(summary);

  for (const attachment of attachments) {
    try {
      const sent = await sendTelegramFile(attachment);
      if (!sent) {
        await sendTelegramMessage(
          `Adjunto grande guardado: ${attachment.originalName}` +
          (attachment.publicUrl || attachment.pathOrUrl ? ` (${attachment.publicUrl || attachment.pathOrUrl})` : '')
        );
      }
    } catch (error) {
      logger.warn('Telegram attachment send failed', { error: error.message, file: attachment.originalName });
    }
  }
};

module.exports = {
  isTelegramConfigured: isConfigured,
  sendReportTelegramNotification
};
