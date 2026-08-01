import { sleep } from '@/utils/asyncUtils';
import { isTransientSmtpError } from '@/services/smtpService';

export const MAX_RETRIES = 2; // 3 attempts total
const BASE_BACKOFF_MS = 1000;

export interface RetryOutcome {
  success: boolean;
  attempts: number;
  finalError: string | null;
}

/**
 * Runs `sendFn` up to 3 attempts total (1 initial + 2 retries), using
 * exponential backoff, but only retries errors classified as transient
 * (network failure, timeout, 5xx, temporary SMTP failure). Permanent
 * failures (auth failure, invalid mailbox) fail immediately.
 */
export async function sendWithRetry(sendFn: () => Promise<void>): Promise<RetryOutcome> {
  let attempts = 0;
  let lastError: unknown = null;

  while (attempts < MAX_RETRIES + 1) {
    attempts += 1;
    try {
      await sendFn();
      return { success: true, attempts, finalError: null };
    } catch (error) {
      lastError = error;

      const retryable = isTransientSmtpError(error);
      const attemptsRemaining = attempts < MAX_RETRIES + 1;

      if (!retryable || !attemptsRemaining) {
        break;
      }

      const backoff = BASE_BACKOFF_MS * Math.pow(2, attempts - 1);
      await sleep(backoff);
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  return { success: false, attempts, finalError: message };
}
