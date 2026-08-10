// ---------------------------------------------------------------------------
// Renders the subject and body a user typed in the compose form into the final
// per-recipient email. Two things here were previously buggy and are the focus
// of this module:
//
//   1. Placeholder resolution is *column-aware*. `{{name}}` is filled with a
//      real name only when the uploaded file actually had a name column with a
//      value for that recipient (otherwise `recipientName` is null here). When
//      it isn't available we fall back PER CONTEXT: the body may use a friendly
//      greeting ("there"), but the SUBJECT must never silently become
//      "Hello there, ..." — so the subject fallback defaults to an empty
//      string. Both fallbacks are configurable via env.
//
//   2. HTML escaping happens BEFORE we insert <br> tags, so the line-break tags
//      we generate stay real markup and are never themselves escaped into the
//      literal text "<br />". A plain-text alternative part is produced next to
//      the HTML so text-only clients keep real newlines and never see a <br>.
// ---------------------------------------------------------------------------

/** Default greeting {{name}} resolves to in the BODY when no name is available. */
const DEFAULT_BODY_NAME_FALLBACK = 'there';

/**
 * The value {{name}} resolves to when a recipient has no usable name, per context:
 *  - body:    friendly greeting, configurable via NAME_FALLBACK_BODY (default "there").
 *  - subject: empty by default so we never inject "there" into a subject line;
 *             override deliberately with NAME_FALLBACK_SUBJECT.
 */
function nameFallbackFor(context: 'subject' | 'body'): string {
  if (context === 'subject') {
    return process.env.NAME_FALLBACK_SUBJECT ?? '';
  }
  return process.env.NAME_FALLBACK_BODY ?? DEFAULT_BODY_NAME_FALLBACK;
}

/** A recipient name is only usable when it's a non-empty, non-whitespace string. */
function hasUsableName(name: string | null): boolean {
  return !!(name && name.trim());
}

const NAME_PLACEHOLDER = /{{\s*name\s*}}/gi;

/**
 * Replaces every {{name}} (case-insensitive, tolerant of inner spaces) with the
 * recipient's name, or `fallback` when no usable name is available. When the
 * uploaded file had no name column, `name` is null here and `fallback` is used.
 */
function renderPlaceholders(template: string, name: string | null, fallback: string): string {
  const value = hasUsableName(name) ? (name as string).trim() : fallback;
  return template.replace(NAME_PLACEHOLDER, value);
}

/**
 * Cleans cosmetic artifacts left in a subject when {{name}} collapsed to an
 * empty string (e.g. "Hello , an update" -> "Hello, an update"). Applied only
 * in that exact case, so a subject with a real name — or without {{name}} at
 * all — is never altered.
 */
function tidyEmptyNameSubject(subject: string): string {
  return subject
    .replace(/[ \t]{2,}/g, ' ') // collapse doubled spaces left by the empty name
    .replace(/\s+([,;:.!?])/g, '$1') // drop the space now stranded before punctuation
    .trim();
}

export interface ComposeEmailInput {
  /** Subject typed by the user in the send form. */
  subject: string;
  /** Plain-text body typed by the user in the send form. */
  content: string;
  /** Recipient name from the file, or null when no name column was present. */
  recipientName: string | null;
}

export interface RenderedEmail {
  /** Final subject line with {{name}} resolved. */
  subject: string;
  /** HTML body — the multipart/alternative text/html part. */
  html: string;
  /** Plain-text body — the multipart/alternative text/plain part (real newlines). */
  text: string;
}

/**
 * Builds the final subject, HTML body, and plain-text body for one recipient.
 * The subject and body resolve {{name}} independently so the subject never
 * inherits the body's greeting fallback.
 */
export function renderEmailFromForm(input: ComposeEmailInput): RenderedEmail {
  const rawSubject = input.subject.trim();
  const subjectFallback = nameFallbackFor('subject');

  let subject = renderPlaceholders(rawSubject, input.recipientName, subjectFallback);
  // Only tidy when {{name}} was actually present and collapsed to an empty
  // string — never touch subjects that carry a real name or don't use {{name}}.
  if (!hasUsableName(input.recipientName) && subjectFallback === '' && NAME_PLACEHOLDER.test(rawSubject)) {
    subject = tidyEmptyNameSubject(subject);
  }
  NAME_PLACEHOLDER.lastIndex = 0; // reset the shared global regex after .test()

  const html = buildHtmlBody(input.content, input.recipientName);
  const text = buildTextBody(input.content, input.recipientName);
  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Normalizes CRLF/CR to LF so paragraph and line splitting behave consistently. */
function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Plain-text body: placeholders resolved, newlines preserved exactly and never
 * turned into <br>. Used as the text/plain alternative part so text-only mail
 * clients render clean line breaks.
 */
function buildTextBody(content: string, name: string | null): string {
  const rendered = renderPlaceholders(content, name, nameFallbackFor('body'));
  return normalizeNewlines(rendered).trim();
}

/**
 * HTML body: user text is escaped FIRST, then single newlines become <br /> and
 * blank lines separate <p> paragraphs. Escaping before inserting the <br /> tags
 * is what keeps them real markup instead of the literal string "<br />" in the
 * recipient's inbox.
 */
function buildHtmlBody(content: string, name: string | null): string {
  const rendered = normalizeNewlines(renderPlaceholders(content, name, nameFallbackFor('body')));
  const paragraphs = rendered
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    // Escape the user's text, THEN convert remaining single newlines to <br />.
    // The <br /> we introduce here is never re-escaped.
    .map((paragraph) => escapeHtml(paragraph).replace(/\n/g, '<br />'))
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join('\n    ');

  return `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, Helvetica, sans-serif; color: #1f2937; line-height: 1.6;">
    ${paragraphs}
  </body>
</html>`;
}
