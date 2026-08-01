import nodemailer, { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

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
  html: string;
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

  await client.sendMail({
    from: zohoEmail,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}
