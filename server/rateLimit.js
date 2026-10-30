import prisma from './db.js';
import { logger } from './logger.js';

/**
 * Extract client IP from Vercel's forwarded header (x-forwarded-for)
 * NOT req.ip.
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // Vercel / proxy format: client, proxy1, proxy2
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown-client';
}

/**
 * Cleanup expired RateLimit rows from database
 */
export async function cleanupExpiredRateLimits() {
  try {
    const res = await prisma.rateLimit.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return res.count;
  } catch (err) {
    logger.error('cleanup_expired_ratelimits_error', { error: err.message });
    return 0;
  }
}

let lastCleanupTime = 0;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Run at most once every 5 minutes

async function maybeCleanupExpired() {
  const now = Date.now();
  if (now - lastCleanupTime > CLEANUP_INTERVAL_MS) {
    lastCleanupTime = now;
    // Run cleanup asynchronously without blocking request
    cleanupExpiredRateLimits().catch(() => {});
  }
}

/**
 * DB-backed sliding window counter rate limiter using Prisma upsert per key and window
 * @param {string} prefix - identifier prefix e.g. 'booking', 'login'
 * @param {number} maxRequests - allowed count per window
 * @param {number} windowMs - window duration in ms
 */
export function createDbRateLimiter(prefix, maxRequests, windowMs) {
  return async (req, res, next) => {
    try {
      maybeCleanupExpired();
      const clientIp = getClientIp(req);
      const now = Date.now();
      const windowSlot = Math.floor(now / windowMs);
      const key = `${prefix}:${clientIp}:${windowSlot}`;
      const expiresAt = new Date(now + windowMs * 2);

      const record = await prisma.rateLimit.upsert({
        where: { key },
        update: {
          count: { increment: 1 },
        },
        create: {
          key,
          count: 1,
          expiresAt,
        },
      });

      if (record.count > maxRequests) {
        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        });
      }

      next();
    } catch (err) {
      logger.error('rate_limiter_error', { error: err.message, prefix });
      // In case of transient DB error, do not block legitimate requests
      next();
    }
  };
}

export const createRateLimiter = createDbRateLimiter;

export const bookingRateLimiter = createDbRateLimiter('booking', 10, 60 * 60 * 1000); // 10/hour per IP

/**
 * Login rate limiter:
 * 1. Limits attempts per client IP from Vercel forwarded header (5 attempts / 15 min).
 * 2. Limits login attempts per restaurant slug regardless of IP (10 attempts / 15 min),
 *    with temporary lockout (15-minute lockout).
 */
export async function loginRateLimiter(req, res, next) {
  try {
    maybeCleanupExpired();
    const slug = req.params.slug || req.body?.slug;
    const clientIp = getClientIp(req);
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const lockoutMs = 15 * 60 * 1000; // 15 minutes lockout
    const maxSlugAttempts = 10;
    const maxIpAttempts = 5;
    const windowSlot = Math.floor(now / windowMs);

    // 1. Check if restaurant slug is under temporary lockout
    if (slug) {
      const lockoutKey = `lockout:slug:${slug}`;
      const activeLockout = await prisma.rateLimit.findUnique({
        where: { key: lockoutKey },
      });

      if (activeLockout && activeLockout.expiresAt > new Date(now)) {
        return res.status(429).json({
          error: {
            code: 'TEMPORARY_LOCKOUT',
            message: 'Too many login attempts for this restaurant. Login is temporarily locked out. Please try again in 15 minutes.',
          },
        });
      }

      // Track attempts per restaurant slug regardless of IP
      const slugKey = `login_slug:${slug}:${windowSlot}`;
      const slugRecord = await prisma.rateLimit.upsert({
        where: { key: slugKey },
        update: { count: { increment: 1 } },
        create: {
          key: slugKey,
          count: 1,
          expiresAt: new Date(now + windowMs * 2),
        },
      });

      if (slugRecord.count > maxSlugAttempts) {
        // Trigger temporary lockout
        await prisma.rateLimit.upsert({
          where: { key: lockoutKey },
          update: { expiresAt: new Date(now + lockoutMs) },
          create: {
            key: lockoutKey,
            count: 1,
            expiresAt: new Date(now + lockoutMs),
          },
        });

        return res.status(429).json({
          error: {
            code: 'TEMPORARY_LOCKOUT',
            message: 'Too many login attempts for this restaurant. Login is temporarily locked out. Please try again in 15 minutes.',
          },
        });
      }
    }

    // 2. Track attempts per client IP
    const ipKey = `login_ip:${clientIp}:${windowSlot}`;
    const ipRecord = await prisma.rateLimit.upsert({
      where: { key: ipKey },
      update: { count: { increment: 1 } },
      create: {
        key: ipKey,
        count: 1,
        expiresAt: new Date(now + windowMs * 2),
      },
    });

    if (ipRecord.count > maxIpAttempts) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many login attempts from this address. Please try again after 15 minutes.',
        },
      });
    }

    next();
  } catch (err) {
    logger.error('login_rate_limiter_error', { error: err.message });
    next();
  }
}

/**
 * Honeypot check middleware
 */
export function checkHoneypot(honeypotField = 'website') {
  return (req, res, next) => {
    if (req.body && req.body[honeypotField]) {
      // Spam bot detected
      return res.status(400).json({
        error: {
          code: 'SPAM_DETECTED',
          message: 'Submission rejected.',
        },
      });
    }
    next();
  };
}
