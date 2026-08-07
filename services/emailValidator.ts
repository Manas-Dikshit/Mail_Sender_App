import type { InputRow, ValidationResult, ValidationStatus } from '@/types';
import { checkSyntax } from '@/validators/syntax';
import { checkMxRecords } from '@/validators/dns';

interface SingleEmailOutcome {
  status: ValidationStatus;
  reason: string;
}

/**
 * Validates every row's email through the 2-stage pipeline (syntax → MX).
 * SMTP mailbox verification (the old Stage 3/4) was removed because it
 * requires outbound port 25, which serverless hosts such as Vercel and
 * AWS Lambda block. Each unique email address is only validated once per
 * upload, even if it appears on multiple rows — the result is reused for
 * every duplicate row.
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

  return {
    status: 'VALID',
    reason: '',
  };
}
