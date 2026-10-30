import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../db.js';
import { logger } from '../logger.js';
import { sendWhatsAppTextMessage } from './metaClient.js';
import {
  getInitialChatState,
  processChatMessage,
  CHAT_STEPS,
} from '../../src/shared/chatParser.js';
import {
  getAvailableSlotsForDate,
  findBestFitTable,
  generateReference,
  RESERVATION_STATUS,
} from '../../src/shared/index.js';

const router = Router();

/**
 * Constant-time HMAC-SHA256 signature verification using RAW request body
 */
export function verifyMetaSignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // Raw body buffer is strictly required to verify against wire bytes
  if (!signature || !appSecret || !req.rawBody) {
    return false;
  }

  const parts = signature.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const expectedHash = parts[1];
  const calculatedHash = crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash, 'hex'),
      Buffer.from(calculatedHash, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * GET /api/whatsapp/webhook
 * Meta Webhook verification handshake
 */
router.get('/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === expectedToken) {
    logger.info('whatsapp_webhook_verified');
    return res.status(200).send(challenge);
  }

  logger.warn('whatsapp_webhook_verification_failed', { mode });
  return res.status(403).send('Forbidden');
});

/**
 * POST /api/whatsapp/webhook
 * Handles incoming messages from Meta
 */
router.post('/whatsapp/webhook', async (req, res) => {
  // 1. Verify HMAC Signature using RAW request body
  if (!verifyMetaSignature(req)) {
    logger.warn('whatsapp_invalid_signature');
    return res.status(403).json({ error: 'Invalid webhook signature' });
  }

  // 2. Process payload before returning so serverless runtimes (Vercel) do not terminate prematurely
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];

    // Ignore delivery status notifications or non-text payloads
    if (!message || message.type !== 'text') {
      return res.status(200).json({ received: true });
    }

    const messageId = message.id;
    const phoneNumberId = change.metadata?.phone_number_id;
    const senderPhone = message.from;
    const textBody = message.text?.body?.trim() || '';

    // 3. Check for previous successful processing (Deduplication)
    const alreadyProcessed = await prisma.whatsAppProcessedMessage.findUnique({
      where: { messageId },
    });
    if (alreadyProcessed) {
      logger.info('whatsapp_redelivery_ignored', { messageId });
      return res.status(200).json({ received: true, deduplicated: true });
    }

    // 4. Resolve Restaurant
    let restaurant = null;
    if (phoneNumberId) {
      restaurant = await prisma.restaurant.findFirst({
        where: {
          whatsappPhoneNumberId: phoneNumberId,
          whatsappEnabled: true,
        },
        include: { tables: true },
      });
    }

    if (!restaurant) {
      // Fallback to any restaurant enabled for WhatsApp in test/sandbox
      restaurant = await prisma.restaurant.findFirst({
        where: { whatsappEnabled: true },
        include: { tables: true },
      });
    }

    if (!restaurant) {
      logger.info('whatsapp_message_ignored_no_tenant', { phoneNumberId });
      return res.status(200).json({ received: true });
    }

    // 5. Handle STOP / Opt-Out
    const upperText = textBody.toUpperCase();
    if (upperText === 'STOP' || upperText === 'UNSUBSCRIBE') {
      await prisma.whatsAppConversation.upsert({
        where: {
          restaurantId_senderPhone: {
            restaurantId: restaurant.id,
            senderPhone,
          },
        },
        update: {
          optedOut: true,
          lastMessageAt: new Date(),
        },
        create: {
          restaurantId: restaurant.id,
          senderPhone,
          state: JSON.stringify(getInitialChatState()),
          optedOut: true,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      await sendWhatsAppTextMessage(
        phoneNumberId,
        senderPhone,
        `You have unsubscribed from ${restaurant.name} reservation updates. Reply START to re-subscribe.`
      );

      // Mark message as processed only after succeeding
      await prisma.whatsAppProcessedMessage.create({
        data: {
          messageId,
          restaurantId: restaurant.id,
        },
      });

      return res.status(200).json({ received: true, unsubscribed: true });
    }

    // 6. Load or initialize Conversation State (30-min window)
    let conv = await prisma.whatsAppConversation.findUnique({
      where: {
        restaurantId_senderPhone: {
          restaurantId: restaurant.id,
          senderPhone,
        },
      },
    });

    const isExpired = conv && new Date() > new Date(conv.expiresAt);
    if (conv?.optedOut && upperText !== 'START') {
      logger.info('whatsapp_message_ignored_opted_out', { senderPhone: '[REDACTED]' });
      await prisma.whatsAppProcessedMessage.create({
        data: {
          messageId,
          restaurantId: restaurant.id,
        },
      });
      return res.status(200).json({ received: true, ignored: true });
    }

    let state = null;
    if (!conv || isExpired || upperText === 'START') {
      state = getInitialChatState({
        openTime: restaurant.openTime,
        closeTime: restaurant.closeTime,
        maxPartySize: restaurant.maxPartySize,
      });
    } else {
      try {
        state = JSON.parse(conv.state);
      } catch {
        state = getInitialChatState();
      }
    }

    // 7. Availability slot callback using real database
    const availableSlotsForDateFn = async (date, guests) => {
      const activeReservations = await prisma.reservation.findMany({
        where: {
          restaurantId: restaurant.id,
          date,
          status: { in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.CONFIRMED] },
        },
      });

      return getAvailableSlotsForDate(
        date,
        guests,
        restaurant.tables || [],
        activeReservations,
        {
          openTime: restaurant.openTime,
          closeTime: restaurant.closeTime,
          diningDurationMinutes: 90,
        }
      );
    };

    // 8. Reservation creation callback (Atomic transaction with double-booking prevention)
    const saveReservationFn = async (bookingData) => {
      return prisma.$transaction(async (tx) => {
        const activeReservations = await tx.reservation.findMany({
          where: {
            restaurantId: restaurant.id,
            date: bookingData.date,
            status: { in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.CONFIRMED] },
          },
        });

        const bestTable = findBestFitTable(
          bookingData.guests,
          bookingData.date,
          bookingData.time,
          restaurant.tables,
          activeReservations,
          90
        );

        if (!bestTable) {
          throw new Error('SLOT_UNAVAILABLE');
        }

        const existingRefs = new Set(
          (await tx.reservation.findMany({ select: { reference: true } })).map((r) => r.reference)
        );
        const reference = generateReference(existingRefs);

        const newRes = await tx.reservation.create({
          data: {
            restaurantId: restaurant.id,
            reference,
            name: bookingData.name,
            phone: senderPhone,
            date: bookingData.date,
            time: bookingData.time,
            guests: bookingData.guests,
            status: RESERVATION_STATUS.PENDING,
            source: 'whatsapp',
            whatsappOptIn: true,
            whatsappOptInAt: new Date(),
            tableId: bestTable.id,
            statusEvents: {
              create: {
                toStatus: RESERVATION_STATUS.PENDING,
                reason: 'Created via WhatsApp Cloud API conversational desk',
              },
            },
          },
        });

        return newRes;
      });
    };

    // 9. Run State Machine
    const availableSlots = await availableSlotsForDateFn(
      state.collected.date || new Date().toISOString().slice(0, 10),
      state.collected.guests || 2
    );

    const stepResult = processChatMessage(state, textBody, {
      settings: {
        openTime: restaurant.openTime,
        closeTime: restaurant.closeTime,
        maxPartySize: restaurant.maxPartySize,
      },
      availableSlotsForDateFn: () => availableSlots,
      saveReservationFn: () => {
        // Handled via explicit YES
      },
    });

    let botReply = stepResult.botReply;

    // Check if user confirmed with explicit YES at the CONFIRM step
    if (state.step === CHAT_STEPS.CONFIRM && (upperText === 'YES' || upperText === 'Y')) {
      try {
        const created = await saveReservationFn(state.collected);
        botReply =
          `✅ Reservation request received for ${restaurant.name}!\n\n` +
          `• Ref Code: ${created.reference}\n` +
          `• Date: ${created.date}\n` +
          `• Time: ${created.time}\n` +
          `• Party: ${created.guests} guests\n` +
          `• Status: PENDING HOST REVIEW\n\n` +
          `The restaurant host will review your request shortly. Thank you!`;
      } catch (err) {
        if (err.message === 'SLOT_UNAVAILABLE') {
          botReply = `Sorry, that time slot was just claimed by another guest. Please reply with a different time.`;
        } else {
          botReply = `An error occurred while saving your request. Please try again shortly.`;
        }
      }
    }

    // 10. Persist updated conversation state
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await prisma.whatsAppConversation.upsert({
      where: {
        restaurantId_senderPhone: {
          restaurantId: restaurant.id,
          senderPhone,
        },
      },
      update: {
        state: JSON.stringify(stepResult.newState),
        optedOut: false,
        lastMessageAt: new Date(),
        expiresAt,
      },
      create: {
        restaurantId: restaurant.id,
        senderPhone,
        state: JSON.stringify(stepResult.newState),
        optedOut: false,
        expiresAt,
      },
    });

    // 11. Send Reply via Meta Graph API
    await sendWhatsAppTextMessage(phoneNumberId, senderPhone, botReply);

    // 12. Mark message as processed ONLY after all operations succeed
    await prisma.whatsAppProcessedMessage.create({
      data: {
        messageId,
        restaurantId: restaurant.id,
      },
    });

    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error('whatsapp_webhook_processing_error', { error: err.message });
    // Return 500 on failure so Meta retries delivery
    return res.status(500).json({ error: 'Processing error' });
  }
});

export default router;
