import net from 'net';
import { sleep } from '@/utils/asyncUtils';

export type SmtpProbeStatus =
  | 'VALID'
  | 'INVALID_MAILBOX'
  | 'ACCESS_DENIED'
  | 'TEMPORARY_FAILURE'
  | 'UNKNOWN';

export interface SmtpProbeOutcome {
  status: SmtpProbeStatus;
  reason: string;
}

const SMTP_TIMEOUT_MS = parsePositiveInt(process.env.SMTP_PROBE_TIMEOUT_MS, 8000);
const SMTP_PROBE_ATTEMPTS = parsePositiveInt(process.env.SMTP_PROBE_ATTEMPTS, 3);
const SMTP_RETRY_BASE_DELAY_MS = parsePositiveInt(process.env.SMTP_PROBE_RETRY_BASE_DELAY_MS, 350);
/** The identity we present in HELO/EHLO and MAIL FROM during verification. */
const PROBE_FROM_ADDRESS = process.env.ZOHO_EMAIL || 'verify@localhost';
const PROBE_HELO_DOMAIN = 'localhost';

/**
 * Performs a real SMTP conversation (connect → EHLO → MAIL FROM → RCPT TO →
 * QUIT) against the target mail server, without sending an actual message,
 * to determine whether a mailbox exists.
 *
 * This runs entirely locally against the recipient's own MX host — no
 * third-party verification API is used, per project requirements.
 */
export async function probeMailbox(mxHost: string, email: string): Promise<SmtpProbeOutcome> {
  let lastRetryableOutcome: SmtpProbeOutcome | null = null;
  for (let attempt = 1; attempt <= SMTP_PROBE_ATTEMPTS; attempt += 1) {
    const outcome = await probeMailboxOnce(mxHost, email);
    if (!isRetryableOutcome(outcome)) {
      return outcome;
    }
    lastRetryableOutcome = outcome;

    if (attempt < SMTP_PROBE_ATTEMPTS) {
      await sleep(SMTP_RETRY_BASE_DELAY_MS * attempt);
    }
  }

  return (
    lastRetryableOutcome ?? {
      status: 'UNKNOWN',
      reason: 'SMTP probe failed before a server response was received.',
    }
  );
}

function probeMailboxOnce(mxHost: string, email: string): Promise<SmtpProbeOutcome> {
  return new Promise((resolve) => {
    let settled = false;
    let stage: 'connect' | 'banner' | 'ehlo' | 'mail' | 'rcpt' = 'connect';
    let buffer = '';

    const socket = net.createConnection({ host: mxHost, port: 25 });
    socket.setTimeout(SMTP_TIMEOUT_MS);

    const finish = (outcome: SmtpProbeOutcome) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(outcome);
    };

    socket.on('timeout', () => finish({ status: 'TEMPORARY_FAILURE', reason: 'SMTP connection timed out.' }));
    socket.on('error', (err) =>
      finish({ status: 'UNKNOWN', reason: `Could not connect to mail server: ${err.message}` })
    );

    socket.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\r\n');
      buffer = lines.pop() ?? '';

      const terminalLine = lines.reverse().find((line) => /^\d{3}\s/.test(line));
      if (!terminalLine) return;
      const code = parseInt(terminalLine.slice(0, 3), 10);
      if (Number.isNaN(code)) {
        finish({ status: 'UNKNOWN', reason: `Unexpected SMTP response: "${terminalLine}"` });
        return;
      }

      if (stage === 'banner') {
        if (code >= 200 && code < 400) {
          stage = 'ehlo';
          socket.write(`EHLO ${PROBE_HELO_DOMAIN}\r\n`);
        } else {
          finish(classifyRejection(code, 'Server rejected connection.'));
        }
        return;
      }

      if (stage === 'ehlo') {
        if (code >= 200 && code < 400) {
          stage = 'mail';
          socket.write(`MAIL FROM:<${PROBE_FROM_ADDRESS}>\r\n`);
        } else {
          finish(classifyRejection(code, 'Server rejected EHLO.'));
        }
        return;
      }

      if (stage === 'mail') {
        if (code >= 200 && code < 300) {
          stage = 'rcpt';
          socket.write(`RCPT TO:<${email}>\r\n`);
        } else {
          finish(classifyRejection(code, 'Server rejected sender address.'));
        }
        return;
      }

      if (stage === 'rcpt') {
        socket.write('QUIT\r\n');
        if (code >= 200 && code < 300) {
          finish({ status: 'VALID', reason: '' });
        } else {
          finish(classifyRejection(code, `Server responded ${code} for RCPT TO.`));
        }
        return;
      }
    });

    socket.on('connect', () => {
      stage = 'banner';
    });
  });
}

function isRetryableOutcome(outcome: SmtpProbeOutcome): boolean {
  return outcome.status === 'TEMPORARY_FAILURE' || outcome.status === 'UNKNOWN';
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

/** Maps an SMTP reply code that rejected the probe into our status vocabulary. */
function classifyRejection(code: number, detail: string): SmtpProbeOutcome {
  if (code >= 550 && code <= 553) {
    return { status: 'INVALID_MAILBOX', reason: `Mailbox does not exist (${code}). ${detail}` };
  }
  if (code === 421 || (code >= 450 && code <= 452)) {
    return { status: 'TEMPORARY_FAILURE', reason: `Mail server is temporarily unavailable (${code}). ${detail}` };
  }
  if (code === 554 || code === 502 || code === 503) {
    return { status: 'ACCESS_DENIED', reason: `Server refused verification (${code}). ${detail}` };
  }
  return { status: 'UNKNOWN', reason: `Unexpected server response (${code}). ${detail}` };
}
