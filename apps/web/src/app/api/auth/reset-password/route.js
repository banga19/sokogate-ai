import NeonAdapter from '../../../../../__create/adapter.ts';
import { Pool } from 'pg';
import { hash as hashPassword } from 'argon2';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'development'
    ? false
    : { rejectUnauthorized: true },
});
const adapter = NeonAdapter(pool);

// Rate limiter: max 5 reset attempts per 10 min per IP
const resetLimits = new Map();

function checkResetRateLimit(ip) {
  if (!ip) return { allowed: true };
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 5;
  const record = resetLimits.get(ip);
  if (!record) {
    resetLimits.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (now - record.windowStart > windowMs) {
    resetLimits.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (record.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((record.windowStart + windowMs - now) / 1000) };
  }
  record.count += 1;
  return { allowed: true };
}

function getClientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);
    const rateResult = checkResetRateLimit(clientIp);
    if (!rateResult.allowed) {
      return new Response(JSON.stringify({ error: 'Too many attempts. Try again in ' + rateResult.retryAfter + 's.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateResult.retryAfter) },
      });
    }

    const { token, password, email } = await request.json();

    if (!token || !password || !email) {
      return new Response(JSON.stringify({ error: 'Token, email, and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Enforce minimum 12 characters to prevent weak passwords
    if (password.length < 12) {
      return new Response(JSON.stringify({ error: 'Password must be at least 12 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Sanitize token and email to prevent injection
    if (typeof token !== 'string' || token.length < 8) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use the provided email as identifier (from reset link)
    const verificationToken = await adapter.useVerificationToken({
      identifier: email,
      token,
    });

    if (!verificationToken) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userEmail = verificationToken.identifier;

    const user = await adapter.getUserByEmail(userEmail);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const hashedPassword = await hashPassword(password);

    const existingAccount = user.accounts?.find(
      (account) => account.provider === 'credentials'
    );

    if (existingAccount) {
      await pool.query(
        'UPDATE auth_accounts SET password = $1 WHERE "userId" = $2 AND provider = $3',
        [hashedPassword, user.id, 'credentials']
      );
    } else {
      await adapter.linkAccount({
        extraData: { password: hashedPassword },
        type: 'credentials',
        userId: user.id,
        providerAccountId: user.id,
        provider: 'credentials',
      });
    }

    return new Response(JSON.stringify({ message: 'Password reset successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
