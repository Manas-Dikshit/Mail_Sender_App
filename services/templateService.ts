import fs from 'fs';
import path from 'path';

const TEMPLATES_DIR = path.join(process.cwd(), 'templates');
const SUBJECT_PATH = path.join(TEMPLATES_DIR, 'subject.txt');
const HTML_PATH = path.join(TEMPLATES_DIR, 'email.html');

const GENERIC_NAME_FALLBACK = 'there';

let cachedSubject: string | null = null;
let cachedHtml: string | null = null;

function loadSubjectTemplate(): string {
  if (cachedSubject === null) {
    cachedSubject = fs.readFileSync(SUBJECT_PATH, 'utf-8').trim();
  }
  return cachedSubject;
}

function loadHtmlTemplate(): string {
  if (cachedHtml === null) {
    cachedHtml = fs.readFileSync(HTML_PATH, 'utf-8');
  }
  return cachedHtml;
}

/** Replaces {{name}} with the recipient's name, or a generic fallback if none was provided. */
function renderPlaceholders(template: string, name: string | null): string {
  const displayName = name && name.trim() ? name.trim() : GENERIC_NAME_FALLBACK;
  return template.replace(/{{\s*name\s*}}/gi, displayName);
}

export function renderEmailForRecipient(name: string | null): { subject: string; html: string } {
  const subject = renderPlaceholders(loadSubjectTemplate(), name);
  const html = renderPlaceholders(loadHtmlTemplate(), name);
  return { subject, html };
}
