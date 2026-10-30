import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { bookingRateLimiter, loginRateLimiter, checkHoneypot } from '../rateLimit.js';
import { signSessionToken, setSessionCookie } from '../auth.js';
import {
  createReservationSchema,
  getAvailableSlotsForDate,
  findBestFitTable,
  RESERVATION_STATUS,
  generateReference,
} from '../../src/shared/index.js';

const router = Router();

/**
 * GET /api/health
 */
router.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/r/:slug/public
 * Returns public restaurant profile
 */
router.get('/r/:slug/public', async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true,
        slug: true,
        name: true,
        address: true,
        phone: true,
        whatsappNumber: true,
        openTime: true,
        closeTime: true,
        closedDays: true,
        maxPartySize: true,
        whatsappEnabled: true,
      },
    });

    if (!restaurant) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Restaurant with slug "${req.params.slug}" not found.`,
        },
      });
    }

    return res.json({ restaurant });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

/**
 * GET /api/r/:slug/slots?date=YYYY-MM-DD&guests=N
 * Returns available time slots for party size and date
 */
router.get('/r/:slug/slots', async (req, res) => {
  try {
    const { slug } = req.params;
    const { date, guests } = req.query;

    if (!date || !guests) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Query parameters "date" (YYYY-MM-DD) and "guests" (number) are required.',
        },
      });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      include: { tables: true },
    });

    if (!restaurant) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Restaurant not found.' },
      });
    }

    const parsedGuests = parseInt(guests, 10);
    if (isNaN(parsedGuests) || parsedGuests < 1 || parsedGuests > restaurant.maxPartySize) {
      return res.status(400).json({
        error: {
          code: 'INVALID_GUESTS',
          message: `Guests must be between 1 and ${restaurant.maxPartySize}.`,
        },
      });
    }

    // Fetch active reservations on that date
    const reservations = await prisma.reservation.findMany({
      where: {
        restaurantId: restaurant.id,
        date: String(date),
        status: { in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.CONFIRMED] },
      },
      select: {
        id: true,
        date: true,
        time: true,
        tableId: true,
        status: true,
      },
    });

    const slots = getAvailableSlotsForDate(
      String(date),
      parsedGuests,
      restaurant.tables,
      reservations,
      restaurant
    );

    return res.json({
      date: String(date),
      guests: parsedGuests,
      slots,
    });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

/**
 * POST /api/r/:slug/bookings
 * Public customer booking creation with transaction and double-booking guard
 */
router.post(
  '/r/:slug/bookings',
  bookingRateLimiter,
  checkHoneypot('website'),
  async (req, res) => {
    try {
      const { slug } = req.params;
      const restaurant = await prisma.restaurant.findUnique({
        where: { slug },
        include: { tables: true },
      });

      if (!restaurant) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Restaurant not found.' },
        });
      }

      // Validate input schema
      const schema = createReservationSchema(restaurant);
      const parseResult = schema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.issues[0]?.message || 'Invalid reservation data',
            details: parseResult.error.issues,
          },
        });
      }

      const validData = parseResult.data;

      // Transaction: Atomic re-check of availability and table assignment
      const result = await prisma.$transaction(async (tx) => {
        // Fetch active reservations overlapping that date
        const activeReservations = await tx.reservation.findMany({
          where: {
            restaurantId: restaurant.id,
            date: validData.date,
            status: { in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.CONFIRMED] },
          },
        });

        // Determine best-fit available table
        const bestTable = findBestFitTable(
          validData.guests,
          validData.date,
          validData.time,
          restaurant.tables,
          activeReservations,
          90 // 90-min dining window
        );

        if (!bestTable) {
          throw new Error('SLOT_UNAVAILABLE');
        }

        // Generate collision-checked reference
        const existingRefs = new Set(
          (await tx.reservation.findMany({ select: { reference: true } })).map((r) => r.reference)
        );
        const reference = generateReference(existingRefs);

        const newReservation = await tx.reservation.create({
          data: {
            restaurantId: restaurant.id,
            reference,
            name: validData.name,
            phone: validData.phone,
            date: validData.date,
            time: validData.time,
            guests: validData.guests,
            notes: validData.notes || '',
            status: RESERVATION_STATUS.PENDING,
            source: req.body.source || 'booking-form',
            whatsappOptIn: Boolean(req.body.whatsappOptIn),
            whatsappOptInAt: req.body.whatsappOptIn ? new Date() : null,
            tableId: bestTable.id,
            statusEvents: {
              create: {
                fromStatus: null,
                toStatus: RESERVATION_STATUS.PENDING,
                reason: 'Customer submitted online request',
              },
            },
          },
          include: {
            table: true,
          },
        });

        return newReservation;
      });

      return res.status(201).json({
        success: true,
        reference: result.reference,
        reservation: {
          id: result.id,
          reference: result.reference,
          name: result.name,
          date: result.date,
          time: result.time,
          guests: result.guests,
          status: result.status,
          notes: result.notes,
          createdAt: result.createdAt,
        },
      });
    } catch (err) {
      console.error('POST /api/r/:slug/bookings error:', err);
      if (err.message === 'SLOT_UNAVAILABLE') {
        return res.status(409).json({
          error: {
            code: 'SLOT_UNAVAILABLE',
            message: 'This time slot was just booked by another guest. Please select an alternate slot.',
          },
        });
      }
      return res.status(500).json({
        error: { code: 'SERVER_ERROR', message: err.message },
      });
    }
  }
);

/**
 * POST /api/r/:slug/login
 * Owner authentication
 */
router.post('/r/:slug/login', loginRateLimiter, async (req, res) => {
  try {
    const { slug } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Owner password is required.' },
      });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
    });

    if (!restaurant) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Restaurant not found.' },
      });
    }

    const isMatch = await bcrypt.compare(password, restaurant.ownerPasswordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Incorrect owner password.',
        },
      });
    }

    const token = signSessionToken({
      restaurantId: restaurant.id,
      slug: restaurant.slug,
    });

    setSessionCookie(res, token);

    return res.json({
      success: true,
      restaurant: {
        id: restaurant.id,
        slug: restaurant.slug,
        name: restaurant.name,
        phone: restaurant.phone,
        openTime: restaurant.openTime,
        closeTime: restaurant.closeTime,
        maxPartySize: restaurant.maxPartySize,
        mustChangePassword: restaurant.mustChangePassword,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

export default router;
