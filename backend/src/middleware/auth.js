import crypto from 'node:crypto';
import { query } from '../db.js';

const COOKIE_NAME = 'hackathon_session';
const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 days

const sign = (value, secret) => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(value);
  return `${value}.${hmac.digest('base64url')}`;
};

const unsign = (signedValue, secret) => {
  if (!signedValue) return null;
  const index = signedValue.lastIndexOf('.');
  if (index === -1) return null;
  const value = signedValue.slice(0, index);
  const signature = signedValue.slice(index + 1);
  const expected = sign(value, secret).slice(value.length + 1);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? value : null;
};

export const attachUser = async (req, res, next) => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.error('SESSION_SECRET not configured');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const cookie = req.signedCookies?.[COOKIE_NAME] || req.cookies?.[COOKIE_NAME];
  if (!cookie) {
    req.sessionUser = null;
    return next();
  }

  const payload = unsign(cookie, secret);
  if (!payload) {
    res.clearCookie(COOKIE_NAME);
    req.sessionUser = null;
    return next();
  }

  try {
    const parsed = JSON.parse(payload);
    if (parsed && parsed.userId) {
      // Fetch fresh roles from database
      const roleRows = await query(
        'SELECT r.name FROM user_role ur JOIN role r ON r.role_id = ur.role_id WHERE ur.user_id = ?',
        [parsed.userId]
      );
      req.sessionUser = {
        ...parsed,
        roles: roleRows.map((r) => r.name)
      };
    } else {
      req.sessionUser = null;
    }
  } catch (err) {
    console.error('Failed to parse session cookie', err);
    req.sessionUser = null;
  }

  return next();
};

export const requireAuth = (req, res, next) => {
  if (!req.sessionUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
};

export const requireRoles = (...roles) => (req, res, next) => {
  if (!req.sessionUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userRoles = req.sessionUser.roles || [];
  const hasRole = roles.some((role) => userRoles.includes(role));
  if (!hasRole) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
};

export const setSessionCookie = (res, payload) => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET not configured');
  }
  const value = JSON.stringify(payload);
  const signed = sign(value, secret);
  res.cookie(COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE
  });
};

export const clearSessionCookie = (res) => {
  res.clearCookie(COOKIE_NAME);
};
