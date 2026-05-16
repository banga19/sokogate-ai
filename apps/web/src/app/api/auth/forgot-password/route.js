import { randomBytes } from 'crypto';
import NeonAdapter from '../../../../../__create/adapter.ts';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'development'
    ? false
    : { rejectUnauthorized: true },
});
const adapter = NeonAdapter(pool);

// Rate limiter: max 3 forgot-password requests per 10 min per IP
const forgotPasswordLimits = new Map();

function checkForgotPasswordRateLimit(ip) {
  if (!ip) return { allowed: true };
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxRequests = 3;
  const record = forgotPasswordLimits.get(ip);
  if (!record) {
    forgotPasswordLimits.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (now - record.windowStart > windowMs) {
    forgotPasswordLimits.set(ip, { count: 1, windowStart: now });
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
    const rateResult = checkForgotPasswordRateLimit(clientIp);
    if (!rateResult.allowed) {
      return new Response(JSON.stringify({ error: 'Too many requests. Try again in ' + rateResult.retryAfter + 's.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateResult.retryAfter) },
      });
    }

    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Basic email format validation to prevent injection
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Always return the same response regardless of whether the email exists
    // to prevent user enumeration attacks
    const user = await adapter.getUserByEmail(email);

    if (!user) {
      return new Response(JSON.stringify({ message: 'If an account exists, a password reset email has been sent.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

     const token = randomBytes(32).toString('hex');
     const expires = new Date(Date.now() + 3600000);

     await adapter.createVerificationToken({
       identifier: email,
       token,
       expires,
     });

     // Note: In production, send the reset link via email service instead of logging
     const resetUrl = `${process.env.AUTH_URL || 'http://localhost:3000'}/account/reset-password?email=${encodeURIComponent(email)}&token=${token}`;

    return new Response(JSON.stringify({ message: 'If an account exists, a password reset email has been sent.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}