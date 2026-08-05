import net from 'net';

/**
 * A well-known, highly-available public mail server used purely to test
 * whether outbound port 25 is reachable from this environment at all.
 * We never complete a handshake with it — just attempt a TCP connect.
 */
const PROBE_HOST = process.env.SMTP_REACHABILITY_PROBE_HOST || 'gmail-smtp-in.l.google.com';
const PROBE_TIMEOUT_MS = 3000;

let cachedResult: Promise<boolean> | null = null;

/**
 * Checks, once per warm process/container, whether outbound SMTP (port 25)
 * is reachable from this environment. Serverless platforms (Vercel,
 * Netlify Functions, AWS Lambda, Cloudflare Workers) block outbound port 25
 * unconditionally, and many corporate/ISP networks block it too.
 *
 * Without this check, every email in a batch independently discovers that
 * fact after its own multi-second timeout and retries — turning a file of
 * 20 rows into many minutes of silent hanging. With it, the whole batch
 * finds out once, in a few seconds, and Stage 3/4 is skipped cleanly for
 * every row instead of retried into oblivion.
 *
 * The result is cached for the process lifetime. On a genuinely long-lived
 * server this means a transient network blip could stick as "unreachable"
 * until restart — an acceptable trade-off against the alternative of
 * re-paying this cost on every upload.
 */
export function isPort25Reachable(): Promise<boolean> {
  if (!cachedResult) {
    cachedResult = probeOnce();
  }
  return cachedResult;
}

/** Clears the cached result. Not used in normal request flow — available for tests or an ops-triggered re-check. */
export function resetPort25ReachabilityCache(): void {
  cachedResult = null;
}

/**
 * Whether SMTP-based verification (Stage 3/4) should run at all this batch.
 * Sending `SMTP_VERIFICATION_DISABLED=true` skips even the reachability
 * probe, for environments (e.g. known serverless deployments) where the
 * outcome is already certain and even a 3-second one-time check isn't worth
 * paying on every cold start.
 */
export async function isSmtpVerificationAvailable(): Promise<boolean> {
  if (process.env.SMTP_VERIFICATION_DISABLED === 'true') {
    return false;
  }
  return isPort25Reachable();
}

function probeOnce(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;

    const socket = net.createConnection({ host: PROBE_HOST, port: 25 });
    socket.setTimeout(PROBE_TIMEOUT_MS);

    const finish = (reachable: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(reachable);
    };

    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}