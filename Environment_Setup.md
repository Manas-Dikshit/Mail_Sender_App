# Environment Setup

Copy `.env.example` to `.env` and fill in each value using the steps below.

```bash
cp .env.example .env
```

---

## `ADMIN_USERNAME` / `ADMIN_PASSWORD`

Not fetched from anywhere — you choose these yourself. They're the single
login for the app (no signup, no user table).

- Pick a username that isn't guessable (avoid `admin`/`test`).
- Pick a strong password — this is the only thing standing between the
  internet and your Zoho send credentials if the app is ever exposed
  publicly by mistake.

## `NEXTAUTH_SECRET`

A random secret NextAuth uses to sign session tokens. Generate one:

**macOS/Linux:**
```bash
openssl rand -base64 32
```

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Any OS with Node installed:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Paste the output as-is. Never reuse this value across environments (use a
different one for dev vs. production).

## `NEXTAUTH_URL`

The base URL the app is served from.

- Local development: `http://localhost:3000`
- Production: your real URL, e.g. `https://mail-tool.yourcompany.com`

## `ZOHO_EMAIL`

The Zoho Mail address you want to send *from* (e.g.
`campaigns@yourcompany.com`). This mailbox must already exist in your Zoho
Mail account.

## `ZOHO_APP_PASSWORD`

**This is not your normal Zoho login password.** Zoho requires a separate
app-specific password for SMTP/IMAP clients when two-factor authentication
is relevant, and it's the recommended approach even without 2FA.

Steps to generate one:

1. Log in to [mail.zoho.com](https://mail.zoho.com) with the account you'll
   send from (i.e. the `ZOHO_EMAIL` account).
2. Click your profile icon (top right) → **My Account**.
3. In the left sidebar, go to **Security**.
4. Find **App Passwords** (sometimes listed under **Two-Factor
   Authentication** → **App Passwords** if 2FA is involved).
5. Click **Generate New Password**.
6. Give it a recognizable name, e.g. `bulk-email-sender-smtp`.
7. Zoho shows the password **once** — copy it immediately into
   `ZOHO_APP_PASSWORD` in your `.env` file. You cannot view it again later
   (only revoke and regenerate).

If you don't see an "App Passwords" option, it usually means it's hidden
until Two-Factor Authentication is enabled on the account — enable 2FA
first (**Security** → **Two-Factor Authentication**), then the App
Passwords option appears.

## `ZOHO_SMTP_HOST`

Depends on which Zoho data center your account was created in:

| Region | SMTP host |
|---|---|
| Global / US (most accounts) | `smtp.zoho.com` |
| Europe | `smtp.zoho.eu` |
| India | `smtp.zoho.in` |
| Australia | `smtp.zoho.com.au` |
| China | `smtp.zoho.com.cn` |

If you're not sure which one applies, check the URL you use to log in to
Zoho Mail (e.g. `mail.zoho.eu` → use `smtp.zoho.eu`), or check **Zoho Mail
→ Settings → Mail Accounts → POP/IMAP Access**, which lists your account's
correct SMTP host.

## `ZOHO_SMTP_PORT`

- `465` — implicit TLS (recommended, what this app defaults its `secure`
  flag against).
- `587` — STARTTLS (also supported; the app auto-detects `secure: false`
  for this port).

Use `465` unless your network specifically blocks it.

---

## Verifying everything is correct

After filling in `.env` and running `npm run dev`, upload a small test file
and click **Send Emails**. As of the latest backend update, the app performs
a **pre-flight SMTP check** before sending anything — if `ZOHO_EMAIL`,
`ZOHO_APP_PASSWORD`, `ZOHO_SMTP_HOST`, or `ZOHO_SMTP_PORT` are wrong, you'll
get an immediate, specific error (e.g. *"Zoho rejected the SMTP credentials
(535)..."*) instead of the app appearing to hang or silently failing each
recipient.

---

## Optional: tuning SMTP mailbox verification (Stage 3/4)

These are **not required** — sensible defaults are used if unset — but are
available for advanced tuning or diagnostics:

| Variable | Default | Purpose |
|---|---|---|
| `SMTP_VERIFICATION_DISABLED` | unset (`false`) | Set to `true` to skip Stage 3/4 entirely and rely on syntax + MX checks only. Use this on serverless hosts (Vercel, Netlify, Lambda) where outbound port 25 is always blocked — skips even the one-time reachability probe. |
| `SMTP_REACHABILITY_PROBE_HOST` | `gmail-smtp-in.l.google.com` | The host used for the one-time-per-process "is port 25 reachable at all" check. Rarely needs changing. |
| `SMTP_PROBE_TIMEOUT_MS` | `5000` | Per-attempt timeout for an individual mailbox SMTP probe. |
| `SMTP_PROBE_ATTEMPTS` | `2` | Max attempts per MX host for a single mailbox probe (1 initial + retries). |
| `SMTP_PROBE_RETRY_BASE_DELAY_MS` | `350` | Base backoff delay between probe retries. |

If you're deploying to Netlify, Vercel, or another serverless platform,
set `SMTP_VERIFICATION_DISABLED=true`. Outbound port 25 is unconditionally
blocked on all of these — the app will still validate syntax and confirm
the domain has a real mail server (MX record), it just can't confirm a
specific mailbox exists or detect catch-all domains from that environment.