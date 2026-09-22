import nodemailer, { Transporter } from 'nodemailer';
import { isSyntacticallyValidEmail } from '@/utils/emailUtils';

let transporter: Transporter | null = null;

/**
 * Returns the configured fixed CC recipient read only from process.env.EMAIL_CC.
 * Throws if EMAIL_CC is missing or not a syntactically valid email address so a
 * misconfigured value prevents sending with a clear, server-side error.
 */
export function getCcRecipient(): string {
  const cc = process.env.EMAIL_CC?.trim() ?? '';
  if (!cc) {
    throw new Error('EMAIL_CC is not configured. Set EMAIL_CC in the environment to enable sending.');
  }
  if (!isSyntacticallyValidEmail(cc)) {
    throw new Error(`EMAIL_CC is configured but not a valid email address: "${cc}".`);
  }
  return cc;
}

/** Lazily builds and caches a single Nodemailer transporter for Zoho SMTP. */
function getTransporter(): Transporter {
  if (transporter) return transporter;

  const { ZOHO_EMAIL, ZOHO_APP_PASSWORD, ZOHO_SMTP_HOST, ZOHO_SMTP_PORT } = process.env;

  if (!ZOHO_EMAIL || !ZOHO_APP_PASSWORD || !ZOHO_SMTP_HOST || !ZOHO_SMTP_PORT) {
    throw new Error(
      'Zoho SMTP is not configured. Set ZOHO_EMAIL, ZOHO_APP_PASSWORD, ZOHO_SMTP_HOST, and ZOHO_SMTP_PORT.'
    );
  }

  const port = Number(ZOHO_SMTP_PORT);

  transporter = nodemailer.createTransport({
    host: ZOHO_SMTP_HOST,
    port,
    secure: port === 465, // true for 465 (implicit TLS), false for 587 (STARTTLS)
    auth: {
      user: ZOHO_EMAIL,
      pass: ZOHO_APP_PASSWORD,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  return transporter;
}

export interface SendMailInput {
  to: string;
  subject: string;
  /** Fully styled HTML body (inline <style> preserved as the operator pasted it). */
  html: string;
  /**
   * Plain-text alternative body. When provided alongside `html`, Nodemailer
   * builds a multipart/alternative message so text-only clients get real
   * newlines (never "<br />") and HTML clients get the styled HTML part.
   */
  text?: string;
  /** Display name shown in the From header, e.g. "Jane Doe" <sender@zoho.com>. */
  fromName?: string;
}

/**
 * Verifies SMTP connectivity/auth quickly before entering the send loop.
 * This fails fast for wrong credentials and avoids per-recipient retry churn.
 */
export async function verifySmtpConnection(timeoutMs = 2000): Promise<void> {
  getCcRecipient(); // Fail fast if EMAIL_CC is missing or invalid.
  const client = getTransporter();

  const verifyPromise = client.verify();
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `SMTP pre-flight check timed out after ${timeoutMs}ms. Check Zoho SMTP host/port, network access, and credentials.`
        )
      );
    }, timeoutMs);
  });

  try {
    await Promise.race([verifyPromise, timeoutPromise]);
  } catch (error) {
    const err = error as { code?: string; responseCode?: number; message?: string };
    const isAuthError = err.code === 'EAUTH' || err.responseCode === 535;

    if (isAuthError) {
      throw new Error('SMTP pre-flight failed: Zoho authentication failed. Check ZOHO_EMAIL and ZOHO_APP_PASSWORD.');
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`SMTP pre-flight failed: ${message}`);
  }
}

/** Classifies a Nodemailer/SMTP error as retryable (transient) or not. */
export function isTransientSmtpError(error: unknown): boolean {
  const err = error as { code?: string; responseCode?: number; message?: string };

  const transientCodes = new Set(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ESOCKET', 'EDNS']);
  if (err.code && transientCodes.has(err.code)) return true;

  if (typeof err.responseCode === 'number') {
    // 4xx = temporary SMTP failure, 5xx = server error worth one retry
    if (err.responseCode >= 400 && err.responseCode < 500) return true;
    if (err.responseCode >= 500 && err.responseCode < 600) return true;
  }

  return false;
}

/** Sends a single email through Zoho SMTP. Throws on failure — caller handles retry. */
export async function sendMail(input: SendMailInput): Promise<void> {
  const zohoEmail = process.env.ZOHO_EMAIL;
  const client = getTransporter();

  // Strip anything that could break out of the From header (quotes, angle
  // brackets, line breaks) before embedding the display name.
  const safeName = (input.fromName ?? '').replace(/[<>"\r\n]/g, '').trim();
  const from = safeName ? `"${safeName}" <${zohoEmail}>` : zohoEmail;

  await client.sendMail({
    from,
    to: input.to,
    cc: getCcRecipient(),
    subject: input.subject,
    // Include the text part only when present; with both set Nodemailer emits
    // multipart/alternative (text/plain + text/html) with correct Content-Types.
    ...(input.text ? { text: input.text } : {}),
    html: input.html,
  });
}
