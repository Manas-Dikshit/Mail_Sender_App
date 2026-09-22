// ---------------------------------------------------------------------------
// HTML compose path. The operator pastes a full HTML message into the send
// form; its <title> becomes the email subject and the body is converted to
// plain text for a text-only email. No templates, no placeholders.
// ---------------------------------------------------------------------------

/** Extracts the inner text of the <title> element, tags stripped, trimmed. */
export function extractSubject(html: string): string {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match) return '';
  return match[1].replace(/<[^>]+>/g, '').trim();
}

/**
 * Converts the HTML message into plain text with real newlines (never
 * "<br />"), so text-only emails get clean paragraphs and lists.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|ul|ol)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n\u2022 ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .trim();
}

export interface RenderedEmail {
  /** Subject line taken from the HTML <title> element. */
  subject: string;
  /** The operator's exact HTML body (inline <style> and layout preserved). */
  html: string;
  /** Text-only fallback flattened from the HTML, for text-only mail clients. */
  text: string;
}

/**
 * Produces the final email from the operator's pasted HTML: subject from the
 * <title> element, the styled HTML sent verbatim so CSS renders, and a
 * plain-text alternative derived from it.
 */
export function renderHtmlEmail(html: string): RenderedEmail {
  return { subject: extractSubject(html), html, text: htmlToText(html) };
}