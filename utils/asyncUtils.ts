/** Awaitable sleep, used by the rate limiter and retry backoff. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generates a short, URL-safe, sufficiently unique id (no external deps). */
export function generateId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${random}`;
}
