import { readFileSync } from 'node:fs';
import { detectNameColumn, detectEmailColumn } from './utils/emailUtils.ts';
import { renderEmailFromForm } from './services/templateService.ts';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

let pass = 0, fail = 0;
function check(label: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ''}`); }
}
function headersOf(path: string): string[] {
  const wb = XLSX.read(readFileSync(path));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return (XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[]).map((h) => String(h).trim());
}

// ---- Case A: Raw_Email.xlsx = Scraped_Email / Brand_Name / Website (NO name col) ----
console.log('=== Case A: Raw_Email.xlsx (Scraped_Email, Brand_Name, Website) ===');
const aHeaders = headersOf('uploads/campaign_msc16jx9jf67ch5t_Raw_Email.xlsx');
console.log(`  headers: ${JSON.stringify(aHeaders)}`);
const aEmail = detectEmailColumn(aHeaders);
const aName = detectNameColumn(aHeaders);
console.log(`  email col: ${aEmail} | name col: ${aName}`);
check('A: email column = Scraped_Email', aEmail === 'Scraped_Email', String(aEmail));
check('A: NO name column (Brand_Name is NOT a name)', aName === null, String(aName));
// Guardrail: brand-style columns must never be treated as a person's name.
check('A: Brand_Name explicitly rejected as name', detectNameColumn(['Brand_Name', 'Website']) === null);
check('A: brand still rejected even with "name" substring', detectNameColumn(['company_name']) === null, String(detectNameColumn(['company_name'])));

const aRecipientName = aName ? 'x' : null; // excelParser logic
const ra = renderEmailFromForm({
  subject: 'Hello {{name}}, an update for you',
  content: 'Hi {{name}},\n\nWe noticed your store.\nBest,\nThe Team',
  recipientName: aRecipientName,
});
console.log(`  subject -> ${JSON.stringify(ra.subject)}`);
check('A: subject has NO "there"', !ra.subject.includes('there'), ra.subject);
check('A: subject = "Hello, an update for you"', ra.subject === 'Hello, an update for you', ra.subject);
check('A: html <br /> real (not &lt;br)', ra.html.includes('<br />') && !ra.html.includes('&lt;br'));
check('A: text keeps \\n, no <br>', ra.text.includes('\n') && !ra.text.includes('<br'));

// ---- Case B: sample_recipients.xlsx has "Contact Name" (name col present) ----
console.log('\n=== Case B: sample_recipients.xlsx (has Contact Name) ===');
const bHeaders = headersOf('uploads/campaign_msaqno9p883ij1kk_sample_recipients.xlsx');
console.log(`  headers: ${JSON.stringify(bHeaders)}`);
const bEmail = detectEmailColumn(bHeaders);
const bName = detectNameColumn(bHeaders);
console.log(`  email col: ${bEmail} | name col: ${bName}`);
check('B: email column = Email Address', bEmail === 'Email Address', String(bEmail));
check('B: name column detected (Contact Name)', bName === 'Contact Name', String(bName));

// Simulate a real recipient name value from that column.
const rb = renderEmailFromForm({
  subject: 'Hello {{name}}, an update for you',
  content: 'Hi {{name}},\nWelcome.',
  recipientName: 'Acme Corp',
});
console.log(`  subject -> ${JSON.stringify(rb.subject)}`);
check('B: subject uses real name', rb.subject === 'Hello Acme Corp, an update for you', rb.subject);
check('B: body uses real name', rb.text.startsWith('Hi Acme Corp,'), rb.text);
check('B: no "there" anywhere', !(rb.subject + rb.html + rb.text).includes('there'));

console.log(`\n---------------------------------------------`);
console.log(`REAL-FILE RESULTS: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
