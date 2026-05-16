/**
 * Simple in-memory rate limiter with sliding window
 * Suitable for single-instance deployments; for multi-instance, replace with Redis
 */

class RateLimiter {
  constructor() {
    this.store = new Map(); // key -> { timestamps: number[], maxRequests, windowMs }
    this.cleanupInterval = null;
    this.startCleanup();
  }

  /**
   * Check if a request is allowed
   * @param {string} key - Identifier (IP, visitorId, user email)
   * @param {number} maxRequests - Max requests allowed in window
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Object} { allowed, remaining, resetAt, tryAgainIn }
   */
  check(key, maxRequests = 30, windowMs = 60 * 1000) {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record) {
      // First request
      this.store.set(key, {
        timestamps: [now],
        maxRequests,
        windowMs,
      });
      return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs, tryAgainIn: 0 };
    }

    // Clean old timestamps outside window
    const windowStart = now - windowMs;
    record.timestamps = record.timestamps.filter(ts => ts > windowStart);

    // Check if limit exceeded
    if (record.timestamps.length >= maxRequests) {
      const oldestRequest = Math.min(...record.timestamps);
      const resetAt = oldestRequest + windowMs;
      const tryAgainIn = Math.max(0, resetAt - now);
      return { allowed: false, remaining: 0, resetAt, tryAgainIn };
    }

    // Allow request
    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: maxRequests - record.timestamps.length,
      resetAt: now + windowMs,
      tryAgainIn: 0,
    };
  }

  /**
   * Reset limits for a key (useful for testing or admin override)
   */
  reset(key) {
    this.store.delete(key);
  }

  /**
   * Clear all entries (memory management)
   */
  clear() {
    this.store.clear();
  }

  /**
   * Get stats for monitoring
   */
  stats() {
    return {
      uniqueKeys: this.store.size,
      totalRequests: Array.from(this.store.values()).reduce((sum, r) => sum + r.timestamps.length, 0),
    };
  }

  /**
   * Start periodic cleanup of expired entries
   */
  startCleanup() {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const retentionMs = 2 * 60 * 1000; // 2 min grace beyond window, beyond which stale entries are purged
      for (const [key, record] of this.store.entries()) {
        if (record.timestamps.length > 0) {
          const newestRequest = Math.max(...record.timestamps);
          if (now - newestRequest > record.windowMs + retentionMs) {
            this.store.delete(key);
          }
        } else {
          this.store.delete(key);
        }
      }
    }, 60 * 1000); // Every minute
  }

  /**
   * Stop cleanup interval (call on process shutdown)
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Apply rate limiting to a request
 * @param {Request} request - The incoming request
 * @param {string} identifier - Unique identifier (IP or visitorId)
 * @param {Object} options - Rate limit options
 * @returns {Response|null} - Returns 429 response if rate limited, null otherwise
 */
export function applyRateLimit(request, identifier, options = {}) {
  const {
    maxRequests = 30,
    windowMs = 60 * 1000,
    onLimitExceeded = null,
  } = options;

  const result = rateLimiter.check(identifier, maxRequests, windowMs);

  if (!result.allowed) {
    if (onLimitExceeded) {
      onLimitExceeded(identifier, result);
    }
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: `Rate limit exceeded: ${maxRequests} requests per ${windowMs / 1000}s`,
        retryAfter: Math.ceil(result.tryAgainIn / 1000),
        resetAt: new Date(result.resetAt).toISOString(),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil(result.tryAgainIn / 1000),
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.floor(result.resetAt / 1000).toString(),
        },
      }
    );
  }

  // Add rate limit headers to successful responses (need to wrap response)
  return null; // Not rate limited
}

/**
 * Rate limit middleware - wraps a request handler
 */
export function withRateLimit(handler, options = {}) {
  return async (request, ...args) => {
    const identifier = options.getIdentifier?.(request) || request.headers.get('X-Visitor-ID');

    if (!identifier) {
      return new Response(
        JSON.stringify({ error: 'Too many requests', message: 'Rate limit could not be determined for your request' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const rateLimitResult = applyRateLimit(request, identifier, options);

    if (rateLimitResult) {
      return rateLimitResult;
    }

    return await handler(request, ...args);
  };
}

export { rateLimiter };
export default rateLimiter;
