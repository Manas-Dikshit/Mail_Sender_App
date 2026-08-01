import { isSyntacticallyValidEmail } from '@/utils/emailUtils';

export interface SyntaxCheckResult {
  passed: boolean;
  reason: string;
}

/** Stage 1: syntax validation. */
export function checkSyntax(email: string): SyntaxCheckResult {
  if (isSyntacticallyValidEmail(email)) {
    return { passed: true, reason: '' };
  }
  return { passed: false, reason: 'Email address does not match a valid format.' };
}
