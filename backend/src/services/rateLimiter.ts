import { connection } from "../lib/redis";

/**
 * Redis-backed sliding-hour-window rate limiter, keyed per sender.
 *
 * Why Redis and not in-memory: the worker can (and in production would)
 * run as multiple instances/processes. An in-memory counter would let each
 * instance send up to the limit independently, blowing past the real cap.
 * Redis INCR is atomic, so concurrent workers share one true counter.
 *
 * Window strategy: fixed hourly buckets keyed by floor(now / 1hr). Simpler
 * and cheaper than a true sliding window (sorted sets), and good enough for
 * "N emails per hour per sender" - the trade-off (documented in README) is
 * a burst is possible right at a window boundary. A sorted-set based sliding
 * window would remove that at the cost of extra Redis memory/ops.
 */

const WINDOW_MS = 60 * 60 * 1000;

function windowKey(senderId: string, atMs: number): string {
  const windowStart = Math.floor(atMs / WINDOW_MS);
  return `ratelimit:sender:${senderId}:${windowStart}`;
}

export interface RateLimitCheck {
  allowed: boolean;
  currentCount: number;
  limit: number;
  /** ms until the next hour window opens, for rescheduling if not allowed */
  retryAfterMs: number;
}

/**
 * Atomically increments this sender's counter for the *current* hour window
 * and reports whether the send is still under the limit. We increment first
 * (reserve a slot) then check - if over, the caller must NOT actually send,
 * and should reschedule; the reserved-but-unused slot is harmless since the
 * window resets anyway.
 */
export async function tryConsumeSlot(
  senderId: string,
  limit: number
): Promise<RateLimitCheck> {
  const now = Date.now();
  const key = windowKey(senderId, now);

  const count = await connection.incr(key);
  if (count === 1) {
    // first hit in this window - set expiry so old windows don't leak
    await connection.pexpire(key, WINDOW_MS);
  }

  const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  const windowEnd = windowStart + WINDOW_MS;

  return {
    allowed: count <= limit,
    currentCount: count,
    limit,
    retryAfterMs: windowEnd - now,
  };
}

export function nextWindowStart(fromMs: number = Date.now()): number {
  const windowStart = Math.floor(fromMs / WINDOW_MS) * WINDOW_MS;
  return windowStart + WINDOW_MS;
}
