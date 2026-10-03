/**
 * Brute-force & Rate Limiting Guard
 * School of Basic Sciences, CSJMU Kanpur
 *
 * Tracks failed authentication attempts by identifier/IP to prevent
 * credential stuffing and brute-force dictionary attacks.
 */

interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

/**
 * Check if a given key (e.g. IP or email) is rate-limited.
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  windowMs: number = DEFAULT_WINDOW_MS
): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record) {
    return {
      allowed: true,
      remainingAttempts: maxAttempts,
      retryAfterSeconds: 0,
    };
  }

  // Check if currently locked out
  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  // Check if sliding window expired
  if (now - record.firstAttemptAt > windowMs) {
    rateLimitStore.delete(key);
    return {
      allowed: true,
      remainingAttempts: maxAttempts,
      retryAfterSeconds: 0,
    };
  }

  // Active window, check attempts
  const remaining = Math.max(0, maxAttempts - record.attempts);
  const isAllowed = record.attempts < maxAttempts;

  return {
    allowed: isAllowed,
    remainingAttempts: remaining,
    retryAfterSeconds: isAllowed
      ? 0
      : Math.ceil((record.firstAttemptAt + windowMs - now) / 1000),
  };
}

/**
 * Record a failed attempt for the key. If max attempts exceeded, blocks the key.
 */
export function recordFailedAttempt(
  key: string,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  windowMs: number = DEFAULT_WINDOW_MS,
  blockDurationMs: number = DEFAULT_BLOCK_DURATION_MS
): void {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now - record.firstAttemptAt > windowMs) {
    rateLimitStore.set(key, {
      attempts: 1,
      firstAttemptAt: now,
    });
    return;
  }

  record.attempts += 1;

  if (record.attempts >= maxAttempts) {
    record.blockedUntil = now + blockDurationMs;
  }
}

/**
 * Reset rate limit counters upon successful login.
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Prune stale records to keep memory bounded.
 */
export function pruneRateLimitStore(): void {
  const now = Date.now();
  rateLimitStore.forEach((record, key) => {
    if (
      record.blockedUntil &&
      record.blockedUntil < now &&
      now - record.firstAttemptAt > DEFAULT_WINDOW_MS
    ) {
      rateLimitStore.delete(key);
    } else if (!record.blockedUntil && now - record.firstAttemptAt > DEFAULT_WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  });
}
