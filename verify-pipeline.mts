import { readFileSync } from 'node:fs';
import { parseUploadedFile } from './services/excelParser.ts';
import { detectNameColumn, detectEmailColumn } from './utils/emailUtils.ts';
import { renderEmailFromForm } from './services/templateService.ts';

let pass = 0, fail = 0;
function check(label: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ''}`); }
}

const file = 'uploads/campaign_msaqmvsb1ma224nn_brand-validation.csv';
const buf = readFileSync(file);
const headers = readFileSync(file, 'utf-8').split(/\r?\n/)[0];
console.log(`=== Real CSV pipeline: ${file} ===`);
console.log(`  headers: ${headers}`);

const rows = parseUploadedFile(buf, '.csv');
const headerList = headers.split(',');
check('email column detected', detectEmailColumn(headerList) !== null, String(detectEmailColumn(headerList)));
check('NO name column detected (Scraped_Email/Brand_Name)', detectNameColumn(headerList) === null);
check('rows parsed with name=null', rows.length > 0 && rows.every((r) => r.name === null), `first: ${JSON.stringify(rows[0])}`);

// Render exactly as the send route does, using the first real row.
const r = renderEmailFromForm({
  subject: 'Hello {{name}}, an update for you', // the templates/subject.txt default
  content: 'Hi {{name}},\n\nThanks for your time.\nBest,\nThe Team',
  recipientName: rows[0].name,
});
console.log(`\n  Rendered subject: ${JSON.stringify(r.subject)}`);
check('subject has NO "there" (real CSV, no name col)', !r.subject.includes('there'), r.subject);
check('subject = "Hello, an update for you"', r.subject === 'Hello, an update for you', r.subject);
check('html <br /> is real markup', r.html.includes('<br />') && !r.html.includes('&lt;br'), r.html);
check('text preserves newlines, no <br>', r.text.includes('\n') && !r.text.includes('<br'), JSON.stringify(r.text));
check('body greeting falls back to "Hi there,"', r.text.startsWith('Hi there,'), r.text);

console.log(`\n---------------------------------------------`);
console.log(`PIPELINE RESULTS: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
