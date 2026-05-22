import { getToken, decode as jwtDecode } from '@auth/core/jwt';
import { appendFileSync, writeFileSync } from 'node:fs';

// ── Cookie helpers ──────────────────────────────────────────────────────────────

/**
 * Read a specific cookie value from either a Hono Context request header
 * (`c.req.header('cookie')`) or a standard Web Fetch Request header
 * (`request.headers.get('cookie')`).
 */
function readCookie(request, name) {
  try {
    const headerMethod = typeof request?.header === 'function' ? 'HONO_HEADER' : 'NO_HONO_HEADER';
    const headersGetMethod = typeof request?.headers?.get === 'function' ? 'HEADERS_GET' : 'NO_HEADERS_GET';
    const rawHeaderValue = request?.header?.('cookie');
    const rawHeadersGetValue = request?.headers?.get?.('cookie');
    const raw = (
      rawHeaderValue
      || rawHeadersGetValue
      || ''
    );
    const cookieEntry = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
    const debug = JSON.stringify({
      headerMethod,
      headersGetMethod,
      rawHeaderLength: rawHeaderValue?.length || 0,
      rawHeadersGetLength: rawHeadersGetValue?.length || 0,
      hasCookie: raw.length > 0,
      cookiePreview: raw.substring(0, 120),
      found: !!cookieEntry,
    });
    appendFileSync('/tmp/auth_debug.log', debug + '\n');
    return cookieEntry;
  } catch (err) {
    appendFileSync('/tmp/auth_debug.log', 'readCookie error: ' + err.message + '\n');
    return null;
  }
}

/**
 * Split a 'name=value' cookie entry and return just the value portion.
 */
function extractValue(cookieEntry) {
  if (!cookieEntry) return null;
  const idx = cookieEntry.indexOf('=');
  return idx >= 0 ? cookieEntry.slice(idx + 1) : null;
}

// ── Auth middleware ─────────────────────────────────────────────────────────────

/**
 * Derive a stable `secureCookie` flag used by @auth/core getToken/decode.
 * Mirrors the logic in `src/__create/@auth/create.js` (the Hono adapter)
 * so both paths agree on whether the `__Secure-` cookie prefix applies.
 */
function resolveSecureCookie() {
  // In production or behind HTTPS reverse proxy
  if (process.env.NODE_ENV === 'production') return true;
  // Dev: check AUTH_URL to decide
  const authUrl = process.env.AUTH_URL || '';
  return authUrl.startsWith('https://');
}

/**
 * Verifies the JWT session token from the `authjs.session-token` cookie.
 *
 * Primary path — `@auth/core`'s `getToken()` handles SessionStore cookie
 * parsing + JWT decryption natively. This works for standard Web Fetch
 * Request objects.
 *
 * Fallback — `getToken()` calls `new Headers(req.headers)` internally.
 * When `req` is a Hono `c.req.raw` (a custom Request subclass whose
 * `.headers` getter returns a plain value object rather than a real
 * `Headers` record), construction of `new Headers(plainObject)` iterates
 * the object's own enumerable properties — `method`, `url`, `headers`,
 * etc. — instead of the actual HTTP header entries. Because of this,
 * `sessionStore` sees no cookie named `authjs.session-token` and
 * `getToken()` returns `null` even when the cookie IS present.
 *
 * The fallback bypasses `@auth/core`'s SessionStore layer entirely.
 * It reads the cookie header string directly from the Node.js
 * `IncomingMessage` via `c.req.header('cookie')` and decrypts the JWT
 * with `@auth/core`'s `decode()` using the same `salt` as the session
 * cookie (`authjs.session-token`), so the derived encryption key matches.
 */
export async function userAuthMiddleware(request) {
  appendFileSync('/tmp/auth_debug.log', '=== userAuthMiddleware called ===\n');
  if (!process.env.AUTH_SECRET) {
    return {
      success: false,
      error: 'Server misconfigured: AUTH_SECRET is not set',
      status: 500,
    };
  }

  const cookieName = 'authjs.session-token';
  const isSecure = resolveSecureCookie();

  // ── Primary path — @auth/core getToken (standard Web Fetch Request) ──
  let token;
  try {
    token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: isSecure,
      cookieName,
    });
  } catch (err) {
    // getToken may throw on malformed cookie header or Hono req shape mismatches
    console.error('[auth] getToken() threw (primary path failed):', err);
  }

  // ── Fallback — direct cookie header read (Hono / edge cases) ──
  if (!token) {
    appendFileSync('/tmp/auth_debug.log', 'FALLBACK path entered: getToken returned null\n');
    const rawCookieEntry = readCookie(request, cookieName);
    const rawToken = extractValue(rawCookieEntry);
    if (rawToken) {
      try {
        // buildCookie() tags every session JWT with salt='authjs.session-token';
        // jwtDecrypt needs the same salt to derive the correct decryption key.
        token = await jwtDecode({
          token: rawToken,
          secret: process.env.AUTH_SECRET,
          salt: cookieName,
        });
        appendFileSync('/tmp/auth_debug.log', 'FALLBACK jwtDecode SUCCESS: email=' + (token?.email || 'null') + '\n');
      } catch (err) {
        appendFileSync('/tmp/auth_debug.log', 'JWT DECODE FAILED: ' + err.message + '\n');
      }
    } else {
      appendFileSync('/tmp/auth_debug.log', 'FALLBACK: no rawToken from cookie. rawCookieEntry=' + String(rawCookieEntry) + '\n');
    }
  }

  if (!token) {
    console.warn(
      '[auth] No valid session token — user must re-authenticate. ' +
      'Cookie header:',
      readCookie(request, cookieName) || '(not present)'
    );
    return { success: false, error: 'Unauthorized', status: 401 };
  }

  if (!token.email) {
    console.error('[auth] Token has no email claim:', String(token).slice(0, 120));
    return { success: false, error: 'Invalid token', status: 401 };
  }

  return { success: true, user: token };
}

/**
 * Accepts any valid session — no admin restriction.
 */
export async function requireUser(request) {
  appendFileSync('/tmp/auth_debug.log', 'requireUser called\n');
  return await userAuthMiddleware(request);
}

// ── Admin middleware ────────────────────────────────────────────────────────────

/**
 * Verifies session AND checks the user's email against ADMIN_EMAILS
 * (comma-separated env var).
 */
export async function adminAuthMiddleware(request) {
  appendFileSync('/tmp/auth_debug.log', '=== adminAuthMiddleware called ===\n');
  const authResult = await userAuthMiddleware(request);
  appendFileSync('/tmp/auth_debug.log', 'adminAuthMiddleware: authResult.success=' + authResult.success + ' error=' + authResult.error + '\n');
  if (!authResult.success) return authResult;

  const adminEmails =
    process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim().toLowerCase()) || [];
  const isAdmin = adminEmails.includes(authResult.user.email.toLowerCase());
  appendFileSync('/tmp/auth_debug.log', 'adminAuthMiddleware: isAdmin=' + isAdmin + ' email=' + authResult.user.email + '\n');

  if (!isAdmin) {
    return { success: false, error: 'Forbidden: Admin access required', status: 403 };
  }

  return authResult;
}

export async function requireAdmin(request) {
  return await adminAuthMiddleware(request);
}
