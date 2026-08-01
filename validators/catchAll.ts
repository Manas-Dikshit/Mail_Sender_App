import { probeMailbox } from '@/validators/smtp';
import { extractDomain } from '@/utils/emailUtils';

/**
 * Stage 4: after a mailbox probes as VALID, check whether the domain accepts
 * mail for literally any address (a "catch-all" server). If a random,
 * near-certainly-nonexistent mailbox also comes back accepted, we can't
 * trust the earlier VALID result — mark it CATCH_ALL instead.
 */
export async function checkCatchAll(mxHost: string, email: string): Promise<boolean> {
  const domain = extractDomain(email);
  const probeLocalPart = `no-such-mailbox-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const probeAddress = `${probeLocalPart}@${domain}`;

  const outcome = await probeMailbox(mxHost, probeAddress);
  return outcome.status === 'VALID';
}
