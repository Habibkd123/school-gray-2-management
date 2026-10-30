// ─── Login Rate Limiter & Brute-Force Protection ─────────────────────
// In-memory sliding window rate limiter for login attempts

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  blockedUntil?: number;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const BLOCK_DURATION_MS = 15 * 60 * 1000; // Block for 15 minutes

const attemptsStore = new Map<string, AttemptRecord>();

export function checkLoginRateLimit(key: string): { blocked: boolean; remainingSeconds?: number } {
  const normalizedKey = key.toLowerCase().trim();
  const now = Date.now();
  const record = attemptsStore.get(normalizedKey);

  if (!record) return { blocked: false };

  // If blocked, check if block has expired
  if (record.blockedUntil && record.blockedUntil > now) {
    const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { blocked: true, remainingSeconds };
  }

  // If block expired or window expired, reset
  if (now - record.firstAttemptAt > WINDOW_MS) {
    attemptsStore.delete(normalizedKey);
    return { blocked: false };
  }

  return { blocked: false };
}

export function recordFailedLogin(key: string): { blocked: boolean; remainingAttempts: number; remainingSeconds?: number } {
  const normalizedKey = key.toLowerCase().trim();
  const now = Date.now();
  const record = attemptsStore.get(normalizedKey);

  if (!record || (now - record.firstAttemptAt > WINDOW_MS)) {
    attemptsStore.set(normalizedKey, {
      count: 1,
      firstAttemptAt: now,
      lastAttemptAt: now,
    });
    return { blocked: false, remainingAttempts: MAX_ATTEMPTS - 1 };
  }

  record.count += 1;
  record.lastAttemptAt = now;

  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    const remainingSeconds = Math.ceil(BLOCK_DURATION_MS / 1000);
    return { blocked: true, remainingAttempts: 0, remainingSeconds };
  }

  return { blocked: false, remainingAttempts: MAX_ATTEMPTS - record.count };
}

export function clearFailedLogins(key: string): void {
  attemptsStore.delete(key.toLowerCase().trim());
}

export function resetAllLoginRateLimits(): void {
  attemptsStore.clear();
}
