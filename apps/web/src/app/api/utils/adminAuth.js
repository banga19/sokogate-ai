import { getToken, decode as jwtDecode } from '@auth/core/jwt';

// ── Cookie helpers ──────────────────────────────────────────────────────────────

/**
 * Read a specific cookie value from either a Hono Context request header
 * (`c.req.header('cookie')`) or a standard Web Fetch Request header
 * (`request.headers.get('cookie')`).
 */
function readCookie(request, name) {
  try {
    return (
      // Hono c.req backed by Node IncomingMessage
      request?.header?.('cookie')
      // Web-standard Request backed by native Headers
      || request?.headers?.get?.('cookie')
      || ''
    )
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`));
  } catch {
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
      } catch (err) {
        console.error('[auth] JWT decode failed (fallback path):', err.message);
      }
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
  return await userAuthMiddleware(request);
}

// ── Admin middleware ────────────────────────────────────────────────────────────

/**
 * Verifies session AND checks the user's email against ADMIN_EMAILS
 * (comma-separated env var).
 */
export async function adminAuthMiddleware(request) {
  const authResult = await userAuthMiddleware(request);
  if (!authResult.success) return authResult;

  const adminEmails =
    process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim().toLowerCase()) || [];
  const isAdmin = adminEmails.includes(authResult.user.email.toLowerCase());

  if (!isAdmin) {
    return { success: false, error: 'Forbidden: Admin access required', status: 403 };
  }

  return authResult;
}

export async function requireAdmin(request) {
  return await adminAuthMiddleware(request);
}
