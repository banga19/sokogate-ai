/**
 * Standardized API Response helpers
 * Enforces consistent response envelope across all API endpoints
 * 
 * Success envelope: { success: true, data, meta?, pagination? }
 * Error envelope: { success: false, error, details?, status }
 */

/**
 * Create a successful response
 * @param {any} data - Primary response data
 * @param {Object} meta - Optional metadata (e.g., counts, timestamps)
 * @param {Object} pagination - Optional pagination info { total, page, totalPages, limit, offset }
 * @param {number} status - HTTP status code (default 200)
 * @returns {Response}
 */
export function ok(data, meta = null, pagination = null, status = 200) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  if (pagination) body.pagination = pagination;
  
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create an error response
 * @param {string} message - Human-readable error message
 * @param {number} status - HTTP status code (default 500)
 * @param {any} details - Optional error details (e.g., validation errors)
 * @returns {Response}
 */
export function error(message, status = 500, details = null) {
  const body = { success: false, error: message };
  if (details) body.details = details;
  
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create a validation error (400)
 */
export function validationError(details) {
  return error('Validation failed', 400, details);
}

/**
 * Create a not found error (404)
 */
export function notFound(message = 'Resource not found') {
  return error(message, 404);
}

/**
 * Create a forbidden error (403)
 */
export function forbidden(message = 'Forbidden') {
  return error(message, 403);
}

/**
 * Create an unauthorized error (401)
 */
export function unauthorized(message = 'Unauthorized') {
  return error(message, 401);
}

/**
 * Create a rate limit error (429)
 */
export function rateLimit(retryAfter = 60) {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Too many requests',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}

export default {
  ok,
  error,
  validationError,
  notFound,
  forbidden,
  unauthorized,
  rateLimit,
};
