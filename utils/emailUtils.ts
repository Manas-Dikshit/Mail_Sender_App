/** RFC-5322-ish practical email syntax check (not overly strict, no ReDoS risk). */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isSyntacticallyValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email.trim());
}

export function extractDomain(email: string): string {
  return email.trim().split('@')[1]?.toLowerCase() ?? '';
}

/** Column header names we recognize as containing the email address. */
const EMAIL_HEADER_CANDIDATES = ['email', 'e-mail', 'email address', 'emailaddress', 'mail'];

/** Column header names we recognize as containing a person's name. */
const NAME_HEADER_CANDIDATES = ['name', 'full name', 'fullname', 'first name', 'firstname'];

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

/** Finds the header (exact key from the row object) that most likely holds emails. */
export function detectEmailColumn(headers: string[]): string | null {
  for (const candidate of EMAIL_HEADER_CANDIDATES) {
    const match = headers.find((h) => normalizeHeader(h) === candidate);
    if (match) return match;
  }
  // Fallback: any header that contains "email"
  const fuzzy = headers.find((h) => normalizeHeader(h).includes('email'));
  return fuzzy ?? null;
}

/** Finds the header that most likely holds a display name, if any. */
export function detectNameColumn(headers: string[]): string | null {
  for (const candidate of NAME_HEADER_CANDIDATES) {
    const match = headers.find((h) => normalizeHeader(h) === candidate);
    if (match) return match;
  }
  return null;
}
