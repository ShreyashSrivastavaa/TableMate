import { Router } from 'express';
import prisma from '../db.js';
import { requireOwnerAuth, clearSessionCookie } from '../auth.js';
import {
  canTransition,
  transitionReservationStatus,
  getTableStatusList,
  settingsSchema,
  RESERVATION_STATUS,
} from '../../src/shared/index.js';

const router = Router();

// Apply owner auth to all routes in this module
router.use('/r/:slug', requireOwnerAuth);

/**
 * GET /api/r/:slug/me
 */
router.get('/r/:slug/me', (req, res) => {
  return res.json({
    authenticated: true,
    restaurant: req.restaurant,
  });
});

/**
 * POST /api/r/:slug/logout
 */
router.post('/r/:slug/logout', (req, res) => {
  clearSessionCookie(res);
  return res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * GET /api/r/:slug/reservations
 * List with search and filtering, strictly scoped to session restaurantId
 */
router.get('/r/:slug/reservations', async (req, res) => {
  try {
    const { status, date, search } = req.query;
    const where = {
      restaurantId: req.restaurant.id,
    };

    if (status && status !== 'ALL') {
      where.status = String(status);
    }

    if (date) {
      where.date = String(date);
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { reference: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ];
    }

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
      include: {
        table: true,
        statusEvents: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    return res.json({ reservations });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

/**
 * GET /api/r/:slug/reservations/export.csv
 * Export all reservations for this restaurant as CSV
 */
router.get('/r/:slug/reservations/export.csv', async (req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { restaurantId: req.restaurant.id },
      include: { table: true },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Reference',
      'Guest Name',
      'Phone',
      'Date',
      'Time',
      'Guests',
      'Status',
      'Table',
      'Source',
      'WhatsApp Opt-In',
      'Notes',
      'Created At',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = reservations.map((r) => [
      escapeCsv(r.reference),
      escapeCsv(r.name),
      escapeCsv(r.phone),
      escapeCsv(r.date),
      escapeCsv(r.time),
      r.guests,
      escapeCsv(r.status),
      escapeCsv(r.table ? `Table ${r.table.number}` : 'Unassigned'),
      escapeCsv(r.source),
      r.whatsappOptIn ? 'Yes' : 'No',
      escapeCsv(r.notes || ''),
      escapeCsv(r.createdAt.toISOString()),
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${req.restaurant.slug}-reservations-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return res.send(csvContent);
  } catch (err) {
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to generate CSV export.' },
    });
  }
});

/**
 * GET /api/r/:slug/reservations/:id
 */
router.get('/r/:slug/reservations/:id', async (req, res) => {
  try {
    const reservation = await prisma.reservation.findFirst({
      where: {
        id: req.params.id,
        restaurantId: req.restaurant.id, // Strict tenant check
      },
      include: {
        table: true,
        statusEvents: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!reservation) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Reservation not found.' },
      });
    }

    return res.json({ reservation });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

/**
 * PATCH /api/r/:slug/reservations/:id/status
 * Enforce state transitions and release table on rejection/cancellation
 */
router.patch('/r/:slug/reservations/:id/status', async (req, res) => {
  try {
    const { status: newStatus, reason } = req.body;

    const reservation = await prisma.reservation.findFirst({
      where: {
        id: req.params.id,
        restaurantId: req.restaurant.id, // Tenant isolation
      },
    });

    if (!reservation) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Reservation not found.' },
      });
    }

    if (!canTransition(reservation.status, newStatus)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot transition reservation from "${reservation.status}" to "${newStatus}".`,
        },
      });
    }

    const shouldReleaseTable =
      newStatus === RESERVATION_STATUS.REJECTED || newStatus === RESERVATION_STATUS.CANCELLED;

    const updated = await prisma.$transaction(async (tx) => {
      const resUpdated = await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          status: newStatus,
          tableId: shouldReleaseTable ? null : reservation.tableId,
        },
        include: {
          table: true,
          statusEvents: {
            orderBy: { timestamp: 'asc' },
          },
        },
      });

      await tx.statusEvent.create({
        data: {
          reservationId: reservation.id,
          fromStatus: reservation.status,
          toStatus: newStatus,
          reason: reason || 'Updated by restaurant owner via dashboard',
        },
      });

      return resUpdated;
    });

    return res.json({ success: true, reservation: updated });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

/**
 * GET /api/r/:slug/settings
 */
router.get('/r/:slug/settings', async (req, res) => {
  return res.json({ settings: req.restaurant });
});

/**
 * PUT /api/r/:slug/settings
 */
router.put('/r/:slug/settings', async (req, res) => {
  try {
    const schema = settingsSchema.omit({ address: true }); // Address is optional or mapped
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid settings',
          details: parsed.error.issues,
        },
      });
    }

    const { restaurantName, contactPhone, openTime, closeTime, maxPartySize } = req.body;

    const updated = await prisma.restaurant.update({
      where: { id: req.restaurant.id },
      data: {
        name: restaurantName || req.restaurant.name,
        phone: contactPhone || req.restaurant.phone,
        openTime,
        closeTime,
        maxPartySize: Number(maxPartySize),
      },
    });

    return res.json({ success: true, settings: updated });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

/**
 * GET /api/r/:slug/tables
 * Floor status calculation for a given date and time
 */
router.get('/r/:slug/tables', async (req, res) => {
  try {
    const { date, time } = req.query;
    const tables = await prisma.table.findMany({
      where: { restaurantId: req.restaurant.id },
      orderBy: { number: 'asc' },
    });

    if (!date || !time) {
      return res.json({ tables });
    }

    const activeReservations = await prisma.reservation.findMany({
      where: {
        restaurantId: req.restaurant.id,
        date: String(date),
        status: { in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.CONFIRMED] },
      },
    });

    const statusList = getTableStatusList(
      String(date),
      String(time),
      tables,
      activeReservations,
      90
    );

    return res.json({ tables: statusList });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

/**
 * Basic Tables CRUD
 */
router.post('/r/:slug/tables', async (req, res) => {
  try {
    const { number, capacity } = req.body;
    if (!number || !capacity) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Table number and capacity are required.' },
      });
    }

    const created = await prisma.table.create({
      data: {
        restaurantId: req.restaurant.id,
        number: String(number).trim(),
        capacity: Number(capacity),
      },
    });

    return res.status(201).json({ table: created });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

router.delete('/r/:slug/tables/:id', async (req, res) => {
  try {
    await prisma.table.delete({
      where: {
        id: req.params.id,
        restaurantId: req.restaurant.id,
      },
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

/**
 * POST /api/r/:slug/change-password
 * Change owner password and unset mustChangePassword flag
 */
router.post('/r/:slug/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 12) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 12 characters long.' },
      });
    }

    const rest = await prisma.restaurant.findUnique({
      where: { id: req.restaurant.id },
    });

    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.default.compare(currentPassword, rest.ownerPasswordHash);
    if (!valid) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Current password is incorrect.' },
      });
    }

    const salt = await bcrypt.default.genSalt(10);
    const ownerPasswordHash = await bcrypt.default.hash(newPassword, salt);

    await prisma.restaurant.update({
      where: { id: req.restaurant.id },
      data: {
        ownerPasswordHash,
        mustChangePassword: false,
      },
    });

    return res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

export default router;
