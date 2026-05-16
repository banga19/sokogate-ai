import { getToken } from '@auth/core/jwt';
import sql from './sql';

/**
 * Admin authentication middleware
 * Verifies JWT token and checks if user is an admin
 * Admin users are determined by email matching ADMIN_EMAILS env var
 * or by having admin=true in auth_users metadata (future enhancement)
 */
export async function adminAuthMiddleware(request) {
  if (!process.env.AUTH_SECRET) {
    return {
      success: false,
      error: 'Server misconfigured: AUTH_SECRET is not set',
      status: 500,
    };
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production',
  });

  if (!token) {
    return {
      success: false,
      error: 'Unauthorized',
      status: 401,
    };
  }

  const userEmail = token.email;
  if (!userEmail) {
    return {
      success: false,
      error: 'Invalid token',
      status: 401,
    };
  }

  // Check if user is admin via environment variable (comma-separated list)
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
  const isAdminByEmail = adminEmails.includes(userEmail.toLowerCase());

  // Future: Check database for admin flag (if schema is updated)
  // try {
  //   const result = await sql`SELECT is_admin FROM auth_users WHERE email = ${userEmail}`;
  //   if (result.length > 0 && result[0].is_admin) {
  //     return { success: true, user: token };
  //   }
  // } catch (err) {
  //   console.error('Admin check DB error:', err);
  // }

  if (!isAdminByEmail) {
    return {
      success: false,
      error: 'Forbidden: Admin access required',
      status: 403,
    };
  }

  return {
    success: true,
    user: token,
  };
}

/**
 * Helper to wrap route handlers with admin auth
 * Usage: export async function POST(request) { const auth = await requireAdmin(request); if (!auth.success) return Response.json(...); }
 */
export async function requireAdmin(request) {
  return await adminAuthMiddleware(request);
}
