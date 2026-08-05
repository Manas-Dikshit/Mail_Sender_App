import type { InputRow, ValidationResult, ValidationStatus } from '@/types';
import { checkSyntax } from '@/validators/syntax';
import { checkMxRecords } from '@/validators/dns';
import { probeMailbox } from '@/validators/smtp';
import { checkCatchAll } from '@/validators/catchAll';
import { isSmtpVerificationAvailable } from '@/services/networkProbe';

interface SingleEmailOutcome {
  status: ValidationStatus;
  reason: string;
}

/** Upper bound on how many MX hosts we'll try per email, even when SMTP verification is available. */
const MAX_MX_HOSTS_TRIED = 2;

/**
 * Validates every row's email through the 4-stage pipeline described in the
 * spec (syntax → MX → SMTP → catch-all). Each unique email address is only
 * validated once per upload, even if it appears on multiple rows — the
 * result is reused for every duplicate row.
 *
 * Before touching any individual email, this checks ONCE whether outbound
 * SMTP is even reachable from this environment. If it isn't (common on
 * serverless hosts, or networks that block port 25), Stage 3/4 is skipped
 * for the entire batch instead of every email separately timing out and
 * retrying into the same dead end.
 */
export async function validateRows(rows: InputRow[]): Promise<ValidationResult[]> {
  const smtpAvailable = await isSmtpVerificationAvailable();
  const cache = new Map<string, Promise<SingleEmailOutcome>>();

  const results: ValidationResult[] = [];
  for (const row of rows) {
    const key = row.email.trim().toLowerCase();

    let pending = cache.get(key);
    if (!pending) {
      pending = validateSingleEmail(row.email, smtpAvailable);
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

async function validateSingleEmail(email: string, smtpAvailable: boolean): Promise<SingleEmailOutcome> {
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

  if (!smtpAvailable) {
    return {
      status: 'UNKNOWN',
      reason:
        'SMTP mailbox verification is unavailable in this environment (outbound port 25 appears blocked). Format and domain checks passed.',
    };
  }

  // Stage 3: SMTP verification (try MX hosts in priority order until one answers,
  // capped so a domain with many MX records can't multiply the worst case).
  const hostsToTry = mx.mxHosts.slice(0, MAX_MX_HOSTS_TRIED);
  const smtpOutcomes = [] as Array<{ host: string; outcome: Awaited<ReturnType<typeof probeMailbox>> }>;
  let successfulHost: string | null = null;
  for (const host of hostsToTry) {
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