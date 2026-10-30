import { logger } from '../logger.js';

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v22.0';

/**
 * Sends a free-form text message via Meta WhatsApp Cloud API
 */
export async function sendWhatsAppTextMessage(phoneNumberId, to, text) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    logger.warn('whatsapp_send_skipped_no_token', { to });
    const err = new Error('WhatsApp access token missing');
    err.code = 'NO_ACCESS_TOKEN';
    throw err;
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: text },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    logger.error('whatsapp_send_failed', { status: res.status, data });
    const error = new Error(`Meta API error: ${res.status} ${JSON.stringify(data || {})}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  logger.info('whatsapp_message_sent', { messageId: data?.messages?.[0]?.id });
  return { success: true, ok: true, data };
}

/**
 * Utility Templates drafted for WhatsApp Business Manager approval
 */
export const WHATSAPP_TEMPLATES = {
  RESERVATION_CONFIRMED: {
    name: 'tablemate_reservation_confirmed',
    language: { code: 'en' },
    components: [
      {
        type: 'body',
        parameters: [
          // {{1}}: Guest Name, {{2}}: Restaurant Name, {{3}}: Party Size, {{4}}: Date, {{5}}: Time, {{6}}: Ref Code
        ],
      },
    ],
    previewText: 'Hello {{1}}, your reservation at {{2}} for party of {{3}} on {{4}} at {{5}} is confirmed. Ref: {{6}}.',
  },
  RESERVATION_REJECTED: {
    name: 'tablemate_reservation_rejected',
    language: { code: 'en' },
    components: [
      {
        type: 'body',
        parameters: [
          // {{1}}: Guest Name, {{2}}: Restaurant Name, {{3}}: Date, {{4}}: Time, {{5}}: Ref Code
        ],
      },
    ],
    previewText: 'Hello {{1}}, unfortunately {{2}} cannot accommodate your request on {{3}} at {{4}}. Ref: {{5}}.',
  },
};
