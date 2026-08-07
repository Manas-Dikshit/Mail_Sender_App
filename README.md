# Internal Bulk Email Sender

A minimal internal web app for a single admin (CEO/manager) to upload a list
of leads, validate their email addresses through a 2-stage local pipeline
(syntax + domain mail-server check), send a campaign through Zoho Mail at a
safe rate, and download a full report.

Built for 2–3 internal users. No public access, no database, no queues.

## Workflow

```
Login → Upload Excel → Read Emails → Validate Emails → Show Summary
      → Send Emails → Generate Report → Download Report
```

## Tech stack

- **Next.js 14** (App Router) + **TypeScript** + **TailwindCSS**
- **NextAuth** (Credentials provider, JWT sessions) — single admin account
  from environment variables, no signup/roles/user management
- **Nodemailer** over **Zoho SMTP**
- **No database.** Uploaded files and generated reports are written to a
  writable runtime directory (project root in local/self-hosted runs,
  `/tmp/internal-bulk-email-sender` on serverless runtimes), and in-progress
  campaign state lives in server memory for the life of the process.

## Project structure

```
app/
  page.tsx                 → redirects to /admin
  login/page.tsx            → login page
  admin/page.tsx             → the dashboard (protected)
  api/
    auth/[...nextauth]/      → NextAuth handler
    upload/                  → upload + run validation pipeline
    send/                    → streams send progress (NDJSON) with retry + rate limit
    report/                  → downloads a generated report file
components/                 → UI: upload panel, validation summary, invalid
                               table, send panel, campaign summary, toasts
lib/                        → auth config, in-memory campaign store, auth guard
services/                   → excel parser, validator orchestrator, SMTP
                               service, rate limiter, retry helper, report
                               generator, email content renderer
validators/                 → the 2 validation stages (syntax, DNS MX)
utils/                      → file safety (path traversal, sanitization),
                               email/column detection, sleep/id helpers
templates/                  → legacy template files (no longer read at
                               send time; the subject and body are now
                               entered in the dashboard before sending)
types/                      → shared TypeScript interfaces
middleware.ts               → protects /admin/* routes
uploads/                    → temporary storage for uploaded files (local)
reports/                    → generated Excel/CSV/HTML/JSON/log reports (local)
```

## Validation pipeline

Each unique email in the uploaded file (duplicates are deduped and reuse the
first result) goes through:

1. **Syntax validation** — regex-based format check
2. **DNS MX lookup** — confirms the domain has a mail server

SMTP mailbox verification (a real `EHLO` → `MAIL FROM` → `RCPT TO` exchange
against the recipient's own mail server) was intentionally removed: it needs
outbound port 25, which serverless hosts such as Vercel and AWS Lambda block.
The pipeline no longer contacts the recipient's mail server at all, so it runs
fine on those platforms.

Possible statuses in practice: `VALID`, `INVALID_FORMAT`, `INVALID_DOMAIN`.
Any email that passes syntax and has an MX record is treated as **sendable**
(`VALID`). The full status vocabulary is still defined in `types/index.ts`
for compatibility, but the SMTP-derived statuses are no longer produced.

## Sending

- Uses **Nodemailer** against Zoho's SMTP server (`ZOHO_SMTP_HOST` /
  `ZOHO_SMTP_PORT`, typically `smtp.zoho.com` / `465`).
- Sends **strictly sequentially**, capped at **25 emails/minute** (safely
  under Zoho's ~30/minute limit), computed as a fixed delay between sends —
  no bursting, no queue, no background worker.
- **Retries** only transient failures (network error, timeout, 5xx, temporary
  SMTP failure) up to **2 times** (3 attempts total) with **exponential
  backoff**. Permanent failures (auth failure, invalid mailbox) fail
  immediately without retry.
- Subject and HTML body are **composed in the dashboard** right before
  sending: the user enters their name, the subject line, and the message
  content in the send form. Both subject and body support a `{{name}}`
  placeholder, filled from the file's Name column when present, or a generic
  greeting otherwise. The sender's name is shown in the From header of every
  email (e.g. `"Jane Doe" <you@yourdomain.com>`).
- Progress (current email, processed/remaining/percentage/status) streams to
  the dashboard live as the campaign runs.

## Reports

After sending, a report is generated in `reports/` in five formats:

- **Excel** (`.xlsx`) — sheets: `Main`, `Sent`, `Failed`, `Skipped`, `Summary`
- **CSV**
- **HTML summary**
- **JSON summary**
- **Workflow log** (`.log`)

Columns: `Row ID`, `Name`, `Email`, `Validation Status`, `Send Status`,
`Attempts`, `Error`, `Timestamp`.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))
```

Fill in `.env`:

| Variable | Description |
|---|---|
| `ADMIN_USERNAME` | The single login username |
| `ADMIN_PASSWORD` | The single login password (choose a strong one) |
| `NEXTAUTH_SECRET` | Random secret — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Base URL of the app, e.g. `http://localhost:3000` |
| `ZOHO_EMAIL` | The Zoho mailbox address to send from |
| `ZOHO_APP_PASSWORD` | A Zoho **app-specific password** (not your login password) |
| `ZOHO_SMTP_HOST` | Usually `smtp.zoho.com` |
| `ZOHO_SMTP_PORT` | `465` (implicit TLS) or `587` (STARTTLS) |

Generating a Zoho app password: Zoho Mail → **Security** → **App Passwords**
→ create one for "Mail"/"SMTP", and use that value (not your normal
password) as `ZOHO_APP_PASSWORD`.

### 3. Compose the email (in the dashboard)

After validation, enter your name, subject line, and message content in the
send form before clicking **Send Emails**. You can use `{{name}}` as a
placeholder for each recipient's name.

## Run

### Development

```bash
npm run dev
```

Visit `http://localhost:3000`, sign in with `ADMIN_USERNAME` /
`ADMIN_PASSWORD`.

### Production

```bash
npm run build
npm run start
```

## Production deployment notes

- Set every variable from `.env.example` in your host's environment
  configuration (not committed to source control).
- This app writes uploads/reports to local disk (`process.cwd()` locally, and
  `/tmp/internal-bulk-email-sender` on serverless). On purely serverless
  platforms, these files are **ephemeral** and can disappear between
  invocations/cold starts. For durable report retention, use persistent object
  storage.
- Confirm your SMTP port (465/587) is allowed for sending to Zoho. Outbound
  port 25 is no longer used anywhere in the app, so it does not need to be
  open.
- Because state (campaign progress, validation/send results) lives in
  server memory, run a **single instance/process** — do not scale this app
  horizontally behind a load balancer, since a second instance won't see the
  first instance's in-progress campaign. **On Vercel/AWS Lambda the in-memory
  store and `/tmp` files are ephemeral per invocation**, which can break the
  upload → validate → send → report flow across requests. See the notes below.
- Set `NEXTAUTH_URL` to your real production URL and use a freshly generated
  `NEXTAUTH_SECRET`.
- Restrict network/firewall access to this app to trusted internal users
  only — there is no rate limiting on the login form or role separation
  beyond the single shared admin account.

## Vercel / serverless caveats

This app was designed for a long-lived single process. On serverless
platforms (Vercel Functions / AWS Lambda) several parts of it do **not** work
as-is:

1. **Stateless invocations.** Campaign state lives in server memory
   (`lib/campaignStore.ts`) and uploads/reports live in `/tmp`. Vercel may
   route each request to a fresh instance and wipe `/tmp` on cold starts, so
   the send/report steps can report "Campaign not found" even though the
   upload succeeded. Fixing this requires moving state to a database or
   object storage and passing the validated rows to the client.
2. **Execution time limits.** Sending is rate-limited to 25 emails/minute.
   Vercel Functions time out after 10 s (Hobby) / up to 60 s (Pro, default)
   unless Fluid compute is enabled, so campaigns larger than a handful of
   emails will be cut off mid-send.
3. **Streaming responses.** The `/api/send` endpoint streams progress as
   NDJSON. Serverless providers may buffer the response until the function
   finishes, so live progress may not appear in the dashboard.
4. **DNS MX lookups** (`dns.resolveMx`) work fine on Vercel's Node runtime —
   no change needed there. Only outbound port 25 (now unused) was blocked.

## Security notes

- SMTP and admin credentials only ever live in environment variables on the
  server; they are never sent to the browser.
- Uploaded filenames are sanitized and all report/upload file paths are
  resolved and checked against their base directory to prevent path
  traversal.
- Uploads are limited to `.xlsx`/`.csv`, capped at 10 MB, and rejected if
  empty.
- All `/admin` pages are protected by middleware; all API routes re-check the
  session server-side independently of the page-level middleware.
