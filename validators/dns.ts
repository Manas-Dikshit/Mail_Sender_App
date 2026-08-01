import dns from 'dns';
import { extractDomain } from '@/utils/emailUtils';

export interface DnsCheckResult {
  passed: boolean;
  reason: string;
  mxHosts: string[];
}

/** Stage 2: DNS MX record lookup for the email's domain. */
export async function checkMxRecords(email: string): Promise<DnsCheckResult> {
  const domain = extractDomain(email);
  if (!domain) {
    return { passed: false, reason: 'Email has no domain part.', mxHosts: [] };
  }

  try {
    const records = await dns.promises.resolveMx(domain);
    if (!records || records.length === 0) {
      return { passed: false, reason: `Domain "${domain}" has no mail server (MX record).`, mxHosts: [] };
    }
    const hosts = records.sort((a, b) => a.priority - b.priority).map((r) => r.exchange);
    return { passed: true, reason: '', mxHosts: hosts };
  } catch {
    return { passed: false, reason: `Domain "${domain}" could not be resolved.`, mxHosts: [] };
  }
}
