import { sleep } from '@/utils/asyncUtils';

/**
 * Zoho allows roughly 30 requests/minute. We stay safely under that by
 * capping ourselves at 25/minute and sending strictly sequentially — no
 * bursting, no queue, no background workers.
 */
export const MAX_SENDS_PER_MINUTE = 25;
export const DELAY_BETWEEN_SENDS_MS = Math.ceil(60000 / MAX_SENDS_PER_MINUTE);

/** Waits the fixed inter-send delay. Call this between each sequential send. */
export async function waitForNextSendSlot(): Promise<void> {
  await sleep(DELAY_BETWEEN_SENDS_MS);
}
