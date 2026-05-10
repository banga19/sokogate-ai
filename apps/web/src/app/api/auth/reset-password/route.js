import NeonAdapter from '../../../../../__create/adapter.ts';
import { Pool } from '@neondatabase/serverless';
import { hash as hashPassword } from 'argon2';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = NeonAdapter(pool);

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return new Response(JSON.stringify({ error: 'Token and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const verificationToken = await adapter.useVerificationToken({
      identifier: '',
      token,
    });

    if (!verificationToken) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const email = verificationToken.identifier;

    const user = await adapter.getUserByEmail(email);
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