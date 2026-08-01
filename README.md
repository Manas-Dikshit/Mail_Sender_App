# Internal Bulk Email Sender

A minimal internal web app for a single admin (CEO/manager) to upload a list
of leads, validate their email addresses through a 4-stage local pipeline,
send a campaign through Zoho Mail at a safe rate, and download a full report.

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
- **No database.** Uploaded files live briefly in `uploads/`, generated
  reports live in `reports/`, and in-progress campaign state lives in server
  memory for the life of the process.

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
                               generator, email template renderer
validators/                 → the 4 validation stages (syntax, DNS, SMTP,
                               catch-all)
utils/                      → file safety (path traversal, sanitization),
                               email/column detection, sleep/id helpers
templates/                  → subject.txt and email.html (edit these to
                               change what gets sent)
types/                      → shared TypeScript interfaces
middleware.ts               → protects /admin/* routes
uploads/                    → temporary storage for uploaded files
reports/                    → generated Excel/CSV/HTML/JSON/log reports
```

## Validation pipeline

Each unique email in the uploaded file (duplicates are deduped and reuse the
first result) goes through:

1. **Syntax validation** — regex-based format check
2. **DNS MX lookup** — confirms the domain has a mail server
3. **SMTP verification** — a real SMTP conversation (`EHLO` → `MAIL FROM` →
   `RCPT TO` → `QUIT`) against the domain's own mail server, run locally, no
   third-party API
4. **Catch-all detection** — if step 3 passed, probes a random nonexistent
   mailbox on the same domain; if that's also accepted, the result is marked
   `CATCH_ALL` instead of `VALID`

Possible statuses: `VALID`, `INVALID_FORMAT`, `INVALID_DOMAIN`,
`INVALID_MAILBOX`, `ACCESS_DENIED`, `TEMPORARY_FAILURE`, `UNKNOWN`,
`CATCH_ALL`. Both `VALID` and `CATCH_ALL` are treated as sendable.

> **Network note:** SMTP verification connects outbound on port 25. Some
> hosting providers and ISPs block outbound port 25 by default. If you see
> every address come back `UNKNOWN`, this is almost always why — check with
> your host/provider or run the app from an environment that allows it.

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
- Subject (`templates/subject.txt`) and HTML body (`templates/email.html`)
  are stored separately from code. Both support a `{{name}}` placeholder,
  filled from the file's Name column when present, or a generic greeting
  otherwise.
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
cp .env.example .env
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

### 3. Edit the email content (optional)

Edit `templates/subject.txt` and `templates/email.html` before running a real
campaign — the defaults are placeholders.

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
- Deploy somewhere that keeps a **persistent, writable filesystem** for
  `uploads/` and `reports/` — this app does not use object storage. A
  container/VM with a persistent volume (or a traditional Node host) works;
  purely serverless/ephemeral-filesystem platforms will lose uploaded files
  and reports on cold start.
- Confirm outbound **port 25** is allowed for SMTP verification, and that
  your SMTP port (465/587) is allowed for sending.
- Because state (campaign progress, validation/send results) lives in
  server memory, run a **single instance/process** — do not scale this app
  horizontally behind a load balancer, since a second instance won't see the
  first instance's in-progress campaign.
- Set `NEXTAUTH_URL` to your real production URL and use a freshly generated
  `NEXTAUTH_SECRET`.
- Restrict network/firewall access to this app to trusted internal users
  only — there is no rate limiting on the login form or role separation
  beyond the single shared admin account.

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
