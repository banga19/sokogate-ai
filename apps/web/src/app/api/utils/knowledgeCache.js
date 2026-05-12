/**
 * Shared in-memory cache for knowledge base
 * Used by chat route to cache knowledge base queries
 * Can be invalidated by admin routes (knowledge settings)
 */

let cache = {
  data: null,
  timestamp: 0,
};

const TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached knowledge base if still fresh
 */
export function getCachedKnowledge() {
  if (cache.data && (Date.now() - cache.timestamp < TTL_MS)) {
    return cache.data;
  }
  return null;
}

/**
 * Set knowledge base cache
 */
export function setCachedKnowledge(data) {
  cache = {
    data,
    timestamp: Date.now(),
  };
}

/**
 * Invalidate cache (e.g., after admin updates knowledge)
 */
export function invalidateKnowledgeCache() {
  cache = { data: null, timestamp: 0 };
}

/**
 * Get cache status (for debugging)
 */
export function getCacheStatus() {
  return {
    hasData: !!cache.data,
    ageMs: Date.now() - cache.timestamp,
    expiresInMs: Math.max(0, TTL_MS - (Date.now() - cache.timestamp)),
  };
}

export default {
  getCachedKnowledge,
  setCachedKnowledge,
  invalidateKnowledgeCache,
  getCacheStatus,
};
