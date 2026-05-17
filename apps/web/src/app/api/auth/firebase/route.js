import sql from "@/app/api/utils/sql";
import { ok, error as apiError, validationError } from "@/app/api/utils/apiResponse";
import { encode, getToken, decode as jwtDecode } from "@auth/core/jwt";

const COOKIE_NAME = "authjs.session-token";
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days — matches @auth/core default

/**
 * GET /api/auth/firebase
 * Echoes the current @auth/core session user. Returns 401 if no session cookie exists.
 */
export async function GET(request) {
  const isSecure = process.env.NODE_ENV === 'production';
  const cookieName = COOKIE_NAME;
  try {
    let token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: isSecure,
      cookieName,
    });

    // Fallback: if primary getToken() fails, derive cookie + decode directly
    if (!token) {
      const cookieHeader =
        request?.header?.('cookie') || request?.headers?.get?.('cookie') || '';
      const rawToken = cookieHeader
        .split(';').map(c => c.trim())
        .find(c => c.startsWith(`${COOKIE_NAME}=`))
        ?.split('=')[1];
      if (rawToken) {
        try {
          token = await jwtDecode({
            token: rawToken,
            secret: process.env.AUTH_SECRET,
            salt: COOKIE_NAME,
          });
        } catch (err) {
          console.error('[auth/firebase GET] JWT decode fallback failed:', err.message);
        }
      }
    }

    if (!token) {
      return apiError("Unauthorized — no active session", 401);
    }

    return ok({
      success: true,
      user: {
        id: token.sub,
        email: token.email,
        name: token.name,
        image: token.picture,
      },
    });
  } catch (err) {
    console.error("Auth/firebase GET error:", err);
    return apiError("Failed to read session", 500);
  }
}

/**
 * POST /api/auth/firebase
 * Bridge: exchanges a Firebase ID token for an @auth/core encrypted session cookie.
 *
 * Calling flow:
 *  1. Client authenticates via Firebase (AuthContext / sign-in page)
 *  2. On success, client calls this endpoint with the Firebase ID token
 *  3. ID token is verified server-side against oauth2.googleapis.com/tokeninfo
 *  4. User is ensured in auth_users + auth_accounts
 *  5. An encrypted session JWT is issued and sent back as
 *     Set-Cookie: __Secure-authjs.session-token=...; Path=/; HttpOnly;
 *     SameSite=None; Secure   (production / HTTPS → cross-site fetch safely)
 *     Set-Cookie: authjs.session-token=...; Path=/; HttpOnly; SameSite=Strict  (HTTP dev)
 *  6. All subsequent /api/* requests carry the cookie; adminAuth.js → getToken() reads it
 */
export async function POST(request) {
  try {
    const { idToken } = await request.json();

    if (!idToken || typeof idToken !== "string") {
      return validationError({ idToken: "Firebase ID token is required" });
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      console.error("Server misconfigured: NEXT_PUBLIC_FIREBASE_API_KEY is not set");
      return apiError("Server misconfigured: Firebase API key missing", 500);
    }

    // ── Step 1: Verify the Firebase ID token ───────────────────────────────
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );

    if (!verifyRes.ok) {
      console.error("Firebase token verification failed:", verifyRes.status);
      return apiError("Firebase ID token could not be verified", 401);
    }

    const firebaseUser = await verifyRes.json();
    if (!firebaseUser.email) {
      return apiError("Token is missing an email claim", 401);
    }

    const email = String(firebaseUser.email).toLowerCase();
    const name = String(firebaseUser.name || email.split("@")[0] || "User");
    const image = firebaseUser.picture || null;
    const firebaseUid = String(firebaseUser.user_id || firebaseUser.sub || "");

    // ── Step 2: Check if the user already has a Firebase credential record ──
    const existingCred = await sql`
      SELECT ac."userId", au.name, au.email, au.image
      FROM auth_accounts ac
      JOIN auth_users au ON ac."userId" = au.id
      WHERE ac."providerAccountId" = ${firebaseUid} AND ac.provider = 'firebase'
      LIMIT 1
    `;

    if (existingCred.length > 0) {
      // Returning user — renew the encrypted session cookie
      const rec = existingCred[0];
      const cookie = buildCookie(
        { sub: rec["userId"], email: rec.email, name: rec.name, image: rec.image }
      );
      return okWithCookie(
        { success: true, user: { id: rec["userId"], email: rec.email, name: rec.name, image: rec.image } },
        cookie
      );
    }

    // ── Step 3: Ensure auth_users record exists ────────────────────────────
    const authUserRow = await sql`
      SELECT id FROM auth_users WHERE email = ${email} LIMIT 1
    `;

    let userId;
    if (authUserRow.length > 0) {
      userId = authUserRow[0].id;
      await sql`
        UPDATE auth_users
        SET name = ${name}, image = ${image}, "emailVerified" = NOW()
        WHERE id = ${userId}
      `;
    } else {
      const newUser = await sql`
        INSERT INTO auth_users (id, name, email, image, "emailVerified")
        VALUES (gen_random_uuid(), ${name}, ${email}, ${image}, NOW())
        RETURNING id
      `;
      userId = newUser[0].id;
    }

    // ── Step 4: Insert auth_accounts row ───────────────────────────────────
    await sql`
      INSERT INTO auth_accounts (id, "userId", type, provider, "providerAccountId")
      VALUES (gen_random_uuid(), ${userId}, 'oauth', 'firebase', ${firebaseUid})
    `;

    // ── Step 5: Issue encrypted session cookie ─────────────────────────────
    const cookie = buildCookie(
      { sub: userId, email, name, image }
    );

    return okWithCookie(
      { success: true, user: { id: userId, email, name, image } },
      cookie
    );
  } catch (err) {
    console.error("Firebase bridge error:", err);
    return apiError("Failed to complete authentication bridge", 500);
  }
}

// ── Session cookie helpers ──────────────────────────────────────────────────────

/**
 * Build a Set-Cookie header using @auth/core JWT (A256CBC-HS512 encrypted).
 *
 * Cookie flags are conditional on whether the connection is secure (HTTPS /
 * reverse-proxied HTTPS). This ensures cookies work in both dev (http://
 * localhost:4000) and production HTTPS.
 *
   * Secure context (HTTPS in production):
   *  name      → __Secure-authjs.session-token   (enforced by browser when Secure)
   *  SameSite  → None  (allows cross-site POST requests to /api/leads)
   *  Secure    → true  (SameSite=None requires it per browser spec)
   *
   * Insecure context (HTTP dev):
   *  name      → authjs.session-token   (plain, no __Secure- prefix)
   *  SameSite  → Strict  (browser rejects SameSite=None without Secure in modern Chrome/Edge)
   *  Secure    → omitted (browsers reject Secure cookies on plain HTTP)
   */
  async function buildCookie(user) {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("AUTH_SECRET is not configured");

    // resolveSecureCookie mirrors the same helper in adminAuth.js
    // so cookie name prefixes stay in sync across buildCookie() and getToken()
    const isSecure = process.env.NODE_ENV === 'production';
    const name = isSecure ? `__Secure-${COOKIE_NAME}` : COOKIE_NAME;
    const sameSite = isSecure ? 'None' : 'Strict';

    const now = Math.floor(Date.now() / 1000);
    const encryptedToken = await encode({
      token: {
        sub: user.sub,
        email: user.email,
        name: user.name,
        picture: user.image,
        iat: now,
        exp: now + MAX_AGE,
      },
      secret,
      maxAge: MAX_AGE,
      salt: COOKIE_NAME,
    });

    return [
      `${name}=${encryptedToken}`,
      "Path=/",
      `SameSite=${sameSite}`,
      ...(isSecure ? ["Secure"] : []),
      `Max-Age=${MAX_AGE}`,
      "HttpOnly",
    ].join("; ");
  }

/**
 * Wrap ok() to inject Set-Cookie into the response headers.
 */
function okWithCookie(data, cookie, status = 200) {
  const body = { success: true, data };
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookie,
    },
  });
}
