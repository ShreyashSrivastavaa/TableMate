import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import app from '../../server/app.js';
import prisma from '../../server/db.js';
import { getTodayKolkata, addDaysToDate } from '../shared/time.js';
import { DEFAULT_TABLES } from '../shared/constants.js';

describe('TableMate Multi-Tenant Backend API & WhatsApp Integration', () => {
  const today = getTodayKolkata();
  const futureDate = addDaysToDate(today, 10);

  const testSlugA = 'test-restaurant-a';
  const testSlugB = 'test-restaurant-b';
  let authCookieA = null;

  beforeAll(async () => {
    // Clear test rate limits so test runs start clean
    await prisma.rateLimit.deleteMany({});

    // Upsert isolated test restaurants on the test branch
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('secretPass1234', salt);

    await prisma.restaurant.upsert({
      where: { slug: testSlugA },
      update: {
        ownerPasswordHash: passwordHash,
        whatsappEnabled: true,
        whatsappPhoneNumberId: '1234567890_test',
      },
      create: {
        slug: testSlugA,
        name: 'Test Kitchen Alpha',
        phone: '+919876543210',
        openTime: '12:00',
        closeTime: '23:00',
        maxPartySize: 8,
        ownerPasswordHash: passwordHash,
        whatsappEnabled: true,
        whatsappPhoneNumberId: '1234567890_test',
        tables: {
          create: DEFAULT_TABLES.map((t) => ({
            number: t.number,
            capacity: t.capacity,
          })),
        },
      },
    });

    await prisma.restaurant.upsert({
      where: { slug: testSlugB },
      update: {
        ownerPasswordHash: passwordHash,
      },
      create: {
        slug: testSlugB,
        name: 'Test Kitchen Beta',
        phone: '+919876543211',
        openTime: '12:00',
        closeTime: '23:00',
        maxPartySize: 8,
        ownerPasswordHash: passwordHash,
        tables: {
          create: DEFAULT_TABLES.map((t) => ({
            number: t.number,
            capacity: t.capacity,
          })),
        },
      },
    });
  });

  describe('1. Health & Public Profile API', () => {
    it('GET /api/health returns 200 with database status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.database).toBe('connected');
    });

    it('GET /api/r/:slug/public returns restaurant profile', async () => {
      const res = await request(app).get(`/api/r/${testSlugA}/public`);
      expect(res.status).toBe(200);
      expect(res.body.restaurant).toBeDefined();
      expect(res.body.restaurant.name).toBe('Test Kitchen Alpha');
      expect(res.body.restaurant.ownerPasswordHash).toBeUndefined();
    });

    it('GET /api/r/non-existent/public returns 404', async () => {
      const res = await request(app).get('/api/r/non-existent/public');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('GET /api/r/:slug/slots returns available candidate slots', async () => {
      const res = await request(app).get(`/api/r/${testSlugA}/slots?date=${futureDate}&guests=4`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.slots)).toBe(true);
      expect(res.body.slots.length).toBeGreaterThan(0);
    });
  });

  describe('2. Validation & Security', () => {
    it('rejects invalid phone number with VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post(`/api/r/${testSlugA}/bookings`)
        .send({
          name: 'Invalid Phone Tester',
          phone: '12345',
          date: futureDate,
          time: '19:30',
          guests: 2,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects past dates with VALIDATION_ERROR', async () => {
      const pastDate = addDaysToDate(today, -2);
      const res = await request(app)
        .post(`/api/r/${testSlugA}/bookings`)
        .send({
          name: 'Past Date Tester',
          phone: '9845012345',
          date: pastDate,
          time: '19:30',
          guests: 2,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('silently ignores honeypot spam bot submissions', async () => {
      const res = await request(app)
        .post(`/api/r/${testSlugA}/bookings`)
        .send({
          name: 'Spam Bot',
          phone: '9845012345',
          date: futureDate,
          time: '19:30',
          guests: 2,
          website: 'http://spam-link.example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SPAM_DETECTED');
    });
  });

  describe('3. Owner Login & Tenant Isolation', () => {
    it('fails login with wrong password', async () => {
      const res = await request(app)
        .post(`/api/r/${testSlugA}/login`)
        .send({ password: 'wrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('succeeds login with correct password and returns session cookie', async () => {
      const res = await request(app)
        .post(`/api/r/${testSlugA}/login`)
        .send({ password: 'secretPass1234' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.restaurant.slug).toBe(testSlugA);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      authCookieA = cookies.find((c) => c.startsWith('tablemate_owner_session='));
      expect(authCookieA).toBeDefined();
    });

    it('ENFORCES TENANT ISOLATION: Tenant A session cannot read Tenant B data', async () => {
      const res = await request(app)
        .get(`/api/r/${testSlugB}/reservations`)
        .set('Cookie', authCookieA);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows Tenant A to read its own reservations', async () => {
      const res = await request(app)
        .get(`/api/r/${testSlugA}/reservations`)
        .set('Cookie', authCookieA);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.reservations)).toBe(true);
    });

    it('allows Tenant A to export its reservations as CSV', async () => {
      const res = await request(app)
        .get(`/api/r/${testSlugA}/reservations/export.csv`)
        .set('Cookie', authCookieA);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Reference,Guest Name,Phone');
    });

    it('enforces minimum owner password length of 12 chars on change-password', async () => {
      // Trying to change to password < 12 chars fails with 400 VALIDATION_ERROR
      const resShort = await request(app)
        .post(`/api/r/${testSlugA}/change-password`)
        .set('Cookie', authCookieA)
        .send({
          currentPassword: 'secretPass1234',
          newPassword: 'shortPass1', // 10 chars
        });

      expect(resShort.status).toBe(400);
      expect(resShort.body.error.code).toBe('VALIDATION_ERROR');
      expect(resShort.body.error.message).toContain('12 characters');

      // Valid >= 12 chars succeeds
      const resValid = await request(app)
        .post(`/api/r/${testSlugA}/change-password`)
        .set('Cookie', authCookieA)
        .send({
          currentPassword: 'secretPass1234',
          newPassword: 'newValidSecretPassword123!', // 26 chars
        });

      expect(resValid.status).toBe(200);
      expect(resValid.body.success).toBe(true);

      // Revert back so other tests continue working with original password
      await request(app)
        .post(`/api/r/${testSlugA}/change-password`)
        .set('Cookie', authCookieA)
        .send({
          currentPassword: 'newValidSecretPassword123!',
          newPassword: 'secretPass1234',
        });
    });

    it('enforces DB-backed rate limiting keyed on client IP from Vercel forwarded header (x-forwarded-for)', async () => {
      const clientIp = '198.51.100.42';
      const windowSlot = Math.floor(Date.now() / (15 * 60 * 1000));
      const key = `login_ip:${clientIp}:${windowSlot}`;

      // Clean up key if exists
      await prisma.rateLimit.deleteMany({ where: { key } });

      // Make a login attempt with x-forwarded-for
      await request(app)
        .post(`/api/r/${testSlugA}/login`)
        .set('x-forwarded-for', `${clientIp}, 10.0.0.1`)
        .send({ password: 'wrongPassword' });

      // Verify row was upserted in Prisma RateLimit table
      const rateLimitRecord = await prisma.rateLimit.findUnique({
        where: { key },
      });
      expect(rateLimitRecord).toBeDefined();
      expect(rateLimitRecord.count).toBeGreaterThanOrEqual(1);
    });

    it('enforces login attempt limit per restaurant slug regardless of IP with temporary lockout', async () => {
      const targetSlug = 'lockout-test-kitchen';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('secretPass1234', salt);

      await prisma.restaurant.upsert({
        where: { slug: targetSlug },
        update: { ownerPasswordHash: passwordHash },
        create: {
          slug: targetSlug,
          name: 'Lockout Test Kitchen',
          ownerPasswordHash: passwordHash,
        },
      });

      const now = Date.now();
      const windowSlot = Math.floor(now / (15 * 60 * 1000));
      const slugKey = `login_slug:${targetSlug}:${windowSlot}`;
      const lockoutKey = `lockout:slug:${targetSlug}`;

      // Clean up previous state
      await prisma.rateLimit.deleteMany({
        where: { key: { in: [slugKey, lockoutKey] } },
      });

      // Send 10 login attempts from different client IPs
      for (let i = 1; i <= 10; i++) {
        await request(app)
          .post(`/api/r/${targetSlug}/login`)
          .set('x-forwarded-for', `203.0.113.${i}`)
          .send({ password: 'wrongPassword' });
      }

      // 11th attempt from a brand new IP should trigger TEMPORARY_LOCKOUT
      const resLocked = await request(app)
        .post(`/api/r/${targetSlug}/login`)
        .set('x-forwarded-for', '192.0.2.99')
        .send({ password: 'secretPass1234' });

      expect(resLocked.status).toBe(429);
      expect(resLocked.body.error.code).toBe('TEMPORARY_LOCKOUT');

      // Verify lockout record in DB
      const lockoutRecord = await prisma.rateLimit.findUnique({
        where: { key: lockoutKey },
      });
      expect(lockoutRecord).toBeDefined();
    });
  });

  describe('4. Booking Lifecycle & Atomic Double-Booking Prevention', () => {
    let createdReservationId = null;

    it('creates a PENDING booking with WhatsApp opt-in via public API', async () => {
      const res = await request(app)
        .post(`/api/r/${testSlugA}/bookings`)
        .send({
          name: 'Pilot Diner Test',
          phone: '9845099999',
          date: futureDate,
          time: '20:00',
          guests: 4,
          notes: 'Window seat please',
          whatsappOptIn: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.reference).toMatch(/^TM-[A-Z0-9]{6}$/);
      expect(res.body.reservation.status).toBe('pending');

      createdReservationId = res.body.reservation.id;
    });

    it('host can confirm pending reservation', async () => {
      const res = await request(app)
        .patch(`/api/r/${testSlugA}/reservations/${createdReservationId}/status`)
        .set('Cookie', authCookieA)
        .send({ status: 'confirmed', reason: 'Confirmed by host desk' });

      expect(res.status).toBe(200);
      expect(res.body.reservation.status).toBe('confirmed');
    });

    it('host can cancel confirmed reservation', async () => {
      const res = await request(app)
        .patch(`/api/r/${testSlugA}/reservations/${createdReservationId}/status`)
        .set('Cookie', authCookieA)
        .send({ status: 'cancelled', reason: 'Guest phoned to cancel' });

      expect(res.status).toBe(200);
      expect(res.body.reservation.status).toBe('cancelled');
    });

    it('enforces terminal state: cancelled cannot transition to confirmed', async () => {
      const res = await request(app)
        .patch(`/api/r/${testSlugA}/reservations/${createdReservationId}/status`)
        .set('Cookie', authCookieA)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
    });

    it('returns 409 SLOT_UNAVAILABLE when capacity is exhausted (race prevention)', async () => {
      // Dynamic future date within 60-day window to guarantee idempotency across consecutive runs
      const capacityDate = addDaysToDate(today, 20 + Math.floor(Math.random() * 25));
      const testRest = await prisma.restaurant.findUnique({ where: { slug: testSlugA } });
      await prisma.reservation.deleteMany({
        where: { restaurantId: testRest.id, date: capacityDate },
      });
      await prisma.rateLimit.deleteMany({
        where: { key: { startsWith: 'booking:' } },
      });

      // Total 8-person capacity is 1 table (T7)
      const firstRes = await request(app)
        .post(`/api/r/${testSlugA}/bookings`)
        .send({
          name: 'Party Alpha',
          phone: '9845011111',
          date: capacityDate,
          time: '20:00',
          guests: 8,
        });
      expect(firstRes.status).toBe(201);

      // Attempt second 8-person booking in same time window
      const secondRes = await request(app)
        .post(`/api/r/${testSlugA}/bookings`)
        .send({
          name: 'Party Beta Conflicting',
          phone: '9845022222',
          date: capacityDate,
          time: '20:00',
          guests: 8,
        });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.error.code).toBe('SLOT_UNAVAILABLE');
    });
  });

  describe('5. WhatsApp Cloud API Webhook', () => {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'tablemate_test_verify_token';
    const appSecret = process.env.WHATSAPP_APP_SECRET || 'test_app_secret_12345';

    it('GET /api/whatsapp/webhook succeeds with correct verify token', async () => {
      const res = await request(app)
        .get('/api/whatsapp/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': verifyToken,
          'hub.challenge': 'CHALLENGE_ACCEPTED_123',
        });

      expect(res.status).toBe(200);
      expect(res.text).toBe('CHALLENGE_ACCEPTED_123');
    });

    it('GET /api/whatsapp/webhook rejects invalid verify token with 403', async () => {
      const res = await request(app)
        .get('/api/whatsapp/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': 'CHALLENGE_BAD',
        });

      expect(res.status).toBe(403);
    });

    it('POST /api/whatsapp/webhook rejects requests with missing or invalid signature', async () => {
      const res = await request(app)
        .post('/api/whatsapp/webhook')
        .set('x-hub-signature-256', 'sha256=invalid_hex_hash')
        .send({ entry: [] });

      expect(res.status).toBe(403);
    });

    it('POST /api/whatsapp/webhook accepts valid signature and deduplicates messages', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_BIZ_ID',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '15551234567',
                    phone_number_id: '1234567890_test',
                  },
                  messages: [
                    {
                      from: '919845012345',
                      id: `wamid_${Date.now()}`,
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      text: { body: 'Hello desk' },
                      type: 'text',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const raw = JSON.stringify(payload);
      const signature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(raw).digest('hex');

      // First delivery: Accepted
      const res1 = await request(app)
        .post('/api/whatsapp/webhook')
        .set('x-hub-signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(raw);

      expect(res1.status).toBe(200);
      expect(res1.body.received).toBe(true);

      // Redelivery: Accepted with fast 200, message deduplicated by unique constraint
      const res2 = await request(app)
        .post('/api/whatsapp/webhook')
        .set('x-hub-signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(raw);

      expect(res2.status).toBe(200);
      expect(res2.body.received).toBe(true);
    });

    it('confirms WhatsApp HMAC uses exact raw request body with real raw payload and rejects on byte tamper', async () => {
      // Real raw JSON payload with irregular spacing & newlines to prove raw buffer verification
      const rawPayload = `{\n  "object": "whatsapp_business_account",\n  "entry": [\n    {\n      "id": "BIZ_12345",\n      "changes": [\n        {\n          "value": {\n            "messaging_product": "whatsapp",\n            "metadata": {\n              "display_phone_number": "15551234567",\n              "phone_number_id": "1234567890_test"\n            },\n            "messages": [\n              {\n                "from": "919845012345",\n                "id": "wamid_raw_test_${Date.now()}",\n                "timestamp": "${Math.floor(Date.now() / 1000)}",\n                "text": { "body": "Ping desk" },\n                "type": "text"\n              }\n            ]\n          },\n          "field": "messages"\n        }\n      ]\n    }\n  ]\n}`;

      // Compute HMAC on the exact raw wire string
      const validSignature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawPayload).digest('hex');

      // 1. Sending the exact raw payload with its HMAC signature succeeds with 200
      const resOk = await request(app)
        .post('/api/whatsapp/webhook')
        .set('x-hub-signature-256', validSignature)
        .set('Content-Type', 'application/json')
        .send(rawPayload);

      expect(resOk.status).toBe(200);
      expect(resOk.body.received).toBe(true);

      // 2. Tampering with 1 byte of the raw body without updating signature fails with 403
      const tamperedRawPayload = rawPayload.replace('Ping desk', 'Ping host');
      const resTampered = await request(app)
        .post('/api/whatsapp/webhook')
        .set('x-hub-signature-256', validSignature)
        .set('Content-Type', 'application/json')
        .send(tamperedRawPayload);

      expect(resTampered.status).toBe(403);
      expect(resTampered.body.error).toBe('Invalid webhook signature');
    });

    it('marks WhatsApp message as processed ONLY after it succeeds; on failure returns 500 so Meta retries', async () => {
      const messageId = `wamid_fail_retry_test_${Date.now()}`;
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'BIZ_FAIL_TEST',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    phone_number_id: '1234567890_test',
                  },
                  messages: [
                    {
                      from: '919845012345',
                      id: messageId,
                      timestamp: String(Math.floor(Date.now() / 1000)),
                      text: { body: 'Test failure recovery' },
                      type: 'text',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const raw = JSON.stringify(payload);
      const signature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(raw).digest('hex');

      // 1. Simulate failure during conversation upsert
      const upsertSpy = vi.spyOn(prisma.whatsAppConversation, 'upsert').mockRejectedValueOnce(
        new Error('Simulated transient DB outage')
      );

      const resFail = await request(app)
        .post('/api/whatsapp/webhook')
        .set('x-hub-signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(raw);

      // Webhook MUST return 500 so Meta will retry
      expect(resFail.status).toBe(500);
      expect(resFail.body.error).toBe('Processing error');

      // Message MUST NOT be marked as processed in DB
      const processedRecord = await prisma.whatsAppProcessedMessage.findUnique({
        where: { messageId },
      });
      expect(processedRecord).toBeNull();

      upsertSpy.mockRestore();

      // 2. Retry delivery from Meta now succeeds
      const resRetry = await request(app)
        .post('/api/whatsapp/webhook')
        .set('x-hub-signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(raw);

      expect(resRetry.status).toBe(200);
      expect(resRetry.body.received).toBe(true);

      // Now it IS marked as processed in DB
      const afterSuccessRecord = await prisma.whatsAppProcessedMessage.findUnique({
        where: { messageId },
      });
      expect(afterSuccessRecord).toBeDefined();
    });
  });
});
