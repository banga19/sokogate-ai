import { randomBytes } from 'crypto';
import NeonAdapter from '../../../../../__create/adapter.ts';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = NeonAdapter(pool);

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await adapter.getUserByEmail(email);

    if (!user) {
      return new Response(JSON.stringify({ message: 'If an account exists, a reset email will be sent' }), {
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

    const resetUrl = `${process.env.AUTH_URL || 'http://localhost:3000'}/account/reset-password?token=${token}`;

    console.log(`Password reset link for ${email}: ${resetUrl}`);

    return new Response(JSON.stringify({ message: 'If an account exists, a reset email will be sent' }), {
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