const GENERIC_NAME_FALLBACK = 'there';

/** Replaces {{name}} with the recipient's name, or a generic fallback if none was provided. */
function renderPlaceholders(template: string, name: string | null): string {
  const displayName = name && name.trim() ? name.trim() : GENERIC_NAME_FALLBACK;
  return template.replace(/{{\s*name\s*}}/gi, displayName);
}

export interface ComposeEmailInput {
  /** Subject typed by the user in the send form. */
  subject: string;
  /** Plain-text body typed by the user in the send form. */
  content: string;
  /** Recipient name from the file, used to fill the {{name}} placeholder. */
  recipientName: string | null;
}

/**
 * Builds the final subject and HTML body from what the user typed in the
 * compose form. The recipient's `{{name}}` placeholder (from the uploaded
 * file's Name column) is substituted per recipient. The body is escaped and
 * wrapped so the user's plain text renders safely as HTML.
 */
export function renderEmailFromForm(input: ComposeEmailInput): { subject: string; html: string } {
  const subject = renderPlaceholders(input.subject.trim(), input.recipientName);
  const html = buildHtmlBody(input.content, input.recipientName);
  return { subject, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtmlBody(content: string, name: string | null): string {
  const rendered = renderPlaceholders(content, name);
  const paragraphs = rendered
    .split(/\r?\n{2,}/)
    .map((paragraph) => paragraph.replace(/\r?\n/g, '<br />').trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('\n    ');

  return `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, Helvetica, sans-serif; color: #1f2937; line-height: 1.6;">
    ${paragraphs}
  </body>
</html>`;
}
