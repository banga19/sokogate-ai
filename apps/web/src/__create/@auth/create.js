import { getToken, decode as jwtDecode } from '@auth/core/jwt';
import { getContext } from 'hono/context-storage';

const COOKIE_NAME = 'authjs.session-token';

/**
 * Derive a stable `secureCookie` flag for @auth/core cookie naming.
 * Mirrors `userAuthMiddleware.resolveSecureCookie()` in adminAuth.js so
 * both the Hono adapter and the API route middleware agree on whether the
 * `__Secure-` prefix should be used for the session cookie.
 */
function resolveSecureCookie() {
  if (process.env.NODE_ENV === 'production') return true;
  const authUrl = process.env.AUTH_URL || '';
  return authUrl.startsWith('https://');
}

/**
 * Read a specific cookie value from a Hono Context request header
 * (`c.req.header('cookie')`).
 */
function readCookie(c, name) {
  try {
    return c.req.header('cookie')
      ?.split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${name}=`));
  } catch {
    return null;
  }
}

/**
 * Split a name=value cookie string and return just the value.
 */
function extractValue(cookieEntry) {
  if (!cookieEntry) return null;
  const idx = cookieEntry.indexOf('=');
  return idx >= 0 ? cookieEntry.slice(idx + 1) : null;
}

export const auth = async () => {
  const c = getContext();
  const isSecure = resolveSecureCookie();

  // Primary path — native @auth/core getToken
  let token;
  try {
    token = await getToken({
      req: c.req.raw,
      secret: process.env.AUTH_SECRET,
      secureCookie: isSecure,
      cookieName: COOKIE_NAME,
    });
  } catch (err) {
    console.error('[auth] getToken() threw in Hono adapter:', err);
  }

  // Fallback — direct cookie read + JWT decode for Hono c.req.raw edge cases
  if (!token) {
    const rawCookieEntry = readCookie(c, COOKIE_NAME);
    const rawToken = extractValue(rawCookieEntry);
    if (rawToken) {
      try {
        token = await jwtDecode({
          token: rawToken,
          secret: process.env.AUTH_SECRET,
          salt: COOKIE_NAME,
        });
      } catch (err) {
        console.error('[auth] JWT decode failed in Hono adapter fallback:', err.message);
      }
    }
  }

  if (token) {
    return {
      user: {
        id: token.sub,
        email: token.email,
        name: token.name,
        image: token.picture,
      },
      expires: token.exp?.toString?.() || '',
    };
  }
};

export default function CreateAuth() {
  return { auth };
}
