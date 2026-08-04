import type { InputRow, ValidationResult, ValidationStatus } from '@/types';
import { checkSyntax } from '@/validators/syntax';
import { checkMxRecords } from '@/validators/dns';
import { probeMailbox } from '@/validators/smtp';
import { checkCatchAll } from '@/validators/catchAll';

interface SingleEmailOutcome {
  status: ValidationStatus;
  reason: string;
}

/**
 * Validates every row's email through the 4-stage pipeline described in the
 * spec (syntax → MX → SMTP → catch-all). Each unique email address is only
 * validated once per upload, even if it appears on multiple rows — the
 * result is reused for every duplicate row.
 */
export async function validateRows(rows: InputRow[]): Promise<ValidationResult[]> {
  const cache = new Map<string, Promise<SingleEmailOutcome>>();

  const results: ValidationResult[] = [];
  for (const row of rows) {
    const key = row.email.trim().toLowerCase();

    let pending = cache.get(key);
    if (!pending) {
      pending = validateSingleEmail(row.email);
      cache.set(key, pending);
    }
    const outcome = await pending;

    results.push({
      rowId: row.rowId,
      email: row.email,
      name: row.name,
      status: outcome.status,
      reason: outcome.reason,
    });
  }

  return results;
}

async function validateSingleEmail(email: string): Promise<SingleEmailOutcome> {
  // Stage 1: syntax
  const syntax = checkSyntax(email);
  if (!syntax.passed) {
    return { status: 'INVALID_FORMAT', reason: syntax.reason };
  }

  // Stage 2: DNS MX
  const mx = await checkMxRecords(email);
  if (!mx.passed) {
    return { status: 'INVALID_DOMAIN', reason: mx.reason };
  }

  // Stage 3: SMTP verification (try MX hosts in priority order until one answers)
  const smtpOutcomes = [] as Array<{ host: string; outcome: Awaited<ReturnType<typeof probeMailbox>> }>;
  let successfulHost: string | null = null;
  for (const host of mx.mxHosts) {
    const outcome = await probeMailbox(host, email);
    smtpOutcomes.push({ host, outcome });
    if (outcome.status === 'VALID') {
      successfulHost = host;
      break;
    }
  }

  if (smtpOutcomes.length === 0) {
    return { status: 'UNKNOWN', reason: 'No mail server responded to verification.' };
  }

  const validOutcome = smtpOutcomes.find((item) => item.outcome.status === 'VALID');
  if (validOutcome) {
    successfulHost = validOutcome.host;
  }

  const invalidMailbox = smtpOutcomes.find((item) => item.outcome.status === 'INVALID_MAILBOX');
  if (invalidMailbox && !successfulHost) {
    return { status: 'INVALID_MAILBOX', reason: invalidMailbox.outcome.reason };
  }

  const accessDenied = smtpOutcomes.find((item) => item.outcome.status === 'ACCESS_DENIED');
  if (accessDenied && !successfulHost) {
    return { status: 'ACCESS_DENIED', reason: accessDenied.outcome.reason };
  }

  if (!successfulHost) {
    const temporaryFailures = smtpOutcomes.filter((item) => item.outcome.status === 'TEMPORARY_FAILURE').length;
    const unknownFailures = smtpOutcomes.filter((item) => item.outcome.status === 'UNKNOWN').length;
    const hostList = smtpOutcomes.map((item) => item.host).join(', ');

    if (temporaryFailures > 0 || unknownFailures > 0) {
      return {
        status: 'TEMPORARY_FAILURE',
        reason: `SMTP verification could not be completed after retries across MX hosts (${hostList}). This does not confirm the mailbox is invalid.`,
      };
    }

    return {
      status: 'UNKNOWN',
      reason: `Mailbox could not be verified on MX hosts (${hostList}).`,
    };
  }

  // Stage 4: catch-all detection (only reached when SMTP said VALID)
  const isCatchAll = await checkCatchAll(successfulHost, email);
  if (isCatchAll) {
    return {
      status: 'CATCH_ALL',
      reason: 'Domain accepts mail for any address; deliverability to this specific mailbox is unconfirmed.',
    };
  }

  return { status: 'VALID', reason: '' };
}
