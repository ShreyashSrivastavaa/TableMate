import jwt from 'jsonwebtoken';
import prisma from './db.js';

const JWT_SECRET = process.env.SESSION_SECRET || 'tablemate-dev-secret-key-at-least-32-chars';
export const COOKIE_NAME = 'tablemate_owner_session';

/**
 * Signs a JWT session token with 12 hour expiry
 */
export function signSessionToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

/**
 * Verifies a JWT session token
 */
export function verifySessionToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Sets the httpOnly session cookie on the response
 */
export function setSessionCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
    path: '/',
  });
}

/**
 * Clears the session cookie
 */
export function clearSessionCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    expires: new Date(0),
    path: '/',
  });
}

/**
 * Authentication middleware ensuring request has valid owner session
 * AND that session restaurantId matches the target :slug restaurant (strict tenant isolation)
 */
export async function requireOwnerAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in.',
      },
    });
  }

  const session = verifySessionToken(token);
  if (!session || !session.restaurantId) {
    return res.status(401).json({
      error: {
        code: 'INVALID_SESSION',
        message: 'Your session has expired. Please log in again.',
      },
    });
  }

  // Ensure restaurant exists
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: session.restaurantId },
    select: {
      id: true,
      slug: true,
      name: true,
      phone: true,
      openTime: true,
      closeTime: true,
      maxPartySize: true,
      createdAt: true,
    },
  });

  if (!restaurant) {
    return res.status(401).json({
      error: {
        code: 'RESTAURANT_NOT_FOUND',
        message: 'Authenticated restaurant account no longer exists.',
      },
    });
  }

  // Tenant Isolation Check: If route has :slug, it MUST match the authenticated restaurant's slug
  if (req.params.slug && req.params.slug !== restaurant.slug) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied. You do not have permission to view or manage another restaurant.',
      },
    });
  }

  req.session = session;
  req.restaurant = restaurant;
  next();
}
