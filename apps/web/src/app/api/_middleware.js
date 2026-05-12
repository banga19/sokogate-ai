/**
 * Global API Middleware for Sokogate AI
 * Automatically applied to all /api/* routes by react-router-hono-server
 * 
 * This middleware adds:
 * - Security headers (CSP, HSTS, etc.)
 * - Request size limits
 * - Rate limiting (initialization via separate utility)
 */

import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';

// Security headers middleware
const securityMiddleware = secureHeaders({
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", "data:", "https:"],
      'font-src': ["'self'", "data:"],
      'connect-src': ["'self'", "wss:", "ws:", "https:"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
    },
  },
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  ...(process.env.NODE_ENV === 'production' && {
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
  }),
});

// Body size limiting
const bodyLimiter = bodyLimit({
  limit: 10 * 1024 * 1024, // 10MB
  multipart: 50 * 1024 * 1024, // 50MB for file uploads
  urlencoded: 10 * 1024 * 1024,
});

/**
 * Apply middleware to Hono app
 * This function is called automatically by react-router-hono-server
 */
export default function middleware(app) {
  // Apply security headers to all routes
  app.use('*', securityMiddleware);
  
  // Apply body size limits to all API routes
  app.use('/api/*', bodyLimiter);
  
  // Initialize rate limiter (no-op, lazy init on first use)
  // Application logs can be added here if needed
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Global API middleware loaded: security headers + body limits');
  }
}

  
  console.log('✅ Global API middleware loaded: security headers + body limits');
}
