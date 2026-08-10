import { readFileSync } from 'node:fs';
import { detectNameColumn, detectEmailColumn } from './utils/emailUtils.ts';
import { renderEmailFromForm } from './services/templateService.ts';

let pass = 0, fail = 0;
function check(label: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ''}`); }
}

const file = 'uploads/campaign_msaqmvsb1ma224nn_brand-validation.csv';
const headerLine = readFileSync(file, 'utf-8').split(/\r?\n/)[0];
const headers = headerLine.split(',').map((h) => h.trim());
console.log(`=== Real CSV column detection: ${file} ===`);
console.log(`  headers: ${JSON.stringify(headers)}`);

// This is the REAL detection code the excel parser uses to decide personalization.
const emailCol = detectEmailColumn(headers);
const nameCol = detectNameColumn(headers);
console.log(`  detectEmailColumn -> ${emailCol}`);
console.log(`  detectNameColumn  -> ${nameCol}`);

check('email column found (Scraped_Email)', emailCol === 'Scraped_Email', String(emailCol));
check('NO name column found -> recipientName will be null', nameCol === null, String(nameCol));

// excelParser sets: name = nameColumn ? record[nameColumn] : null  => null here.
const recipientName = nameCol ? 'unused' : null;

console.log(`\n=== Render with recipientName=${recipientName} (as the send route does) ===`);
const r = renderEmailFromForm({
  subject: 'Hello {{name}}, an update for you',
  content: 'Hi {{name}},\n\nThanks for your time.\nBest,\nThe Team',
  recipientName,
});
console.log(`  subject: ${JSON.stringify(r.subject)}`);
console.log(`  text:\n${r.text.split('\n').map((l) => '    | ' + l).join('\n')}`);
console.log(`  html:\n    ${r.html.replace(/\n/g, '\n    ')}`);

check('subject has NO "there"', !r.subject.includes('there'), r.subject);
check('subject tidied to "Hello, an update for you"', r.subject === 'Hello, an update for you', r.subject);
check('html <br /> is real markup (not literal)', r.html.includes('<br />') && !r.html.includes('&lt;br'), r.html);
check('text preserves \\n and has no <br>', r.text.includes('\n') && !r.text.includes('<br'));
check('body greeting falls back to "Hi there,"', r.text.startsWith('Hi there,'), r.text);

console.log(`\n---------------------------------------------`);
console.log(`PIPELINE RESULTS: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
