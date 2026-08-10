import { renderEmailFromForm } from './services/templateService.ts';
import { SENDABLE_STATUSES, type ValidationResult } from './types/index.ts';

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean, detail = '') {
  if (cond) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ''}`);
  }
}
function section(t: string) {
  console.log(`\n=== ${t} ===`);
}

// ---------------------------------------------------------------------------
section('1. {{name}} when name column EXISTS');
{
  const r = renderEmailFromForm({
    subject: 'Hello {{name}}, an update for you',
    content: 'Hi {{name}},\nWelcome aboard.',
    recipientName: 'Jane Doe',
  });
  check('subject uses real name', r.subject === 'Hello Jane Doe, an update for you', r.subject);
  check('html body uses real name', r.html.includes('Hi Jane Doe,'), r.html);
  check('text body uses real name', r.text.includes('Hi Jane Doe,'), r.text);
  check('no "there" anywhere', !/\bthere\b/.test(r.subject + r.html + r.text));
}

// ---------------------------------------------------------------------------
section('2. {{name}} when name column DOES NOT EXIST (recipientName = null)');
{
  const r = renderEmailFromForm({
    subject: 'Hello {{name}}, an update for you',
    content: 'Hi {{name}},\nWelcome aboard.',
    recipientName: null,
  });
  check('subject has NO "there"', !r.subject.includes('there'), r.subject);
  check('subject tidied (no stray " ,")', r.subject === 'Hello, an update for you', r.subject);
  check('BODY uses configured "there" greeting', r.text.startsWith('Hi there,'), r.text);
  check('html body uses "there"', r.html.includes('Hi there,'), r.html);
}

// ---------------------------------------------------------------------------
section('3. SUBJECT containing {{name}} — leading placeholder, no name');
{
  const r = renderEmailFromForm({
    subject: '{{name}} weekly digest',
    content: 'x',
    recipientName: null,
  });
  check('leading empty name trimmed', r.subject === 'weekly digest', JSON.stringify(r.subject));
  check('no "there" in subject', !r.subject.includes('there'));
}

// ---------------------------------------------------------------------------
section('4. Multiline message (name present)');
{
  const r = renderEmailFromForm({
    subject: 'S',
    content: 'Line1\nLine2\n\nPara2',
    recipientName: 'Bob',
  });
  check('html: single \\n -> <br />', r.html.includes('<p>Line1<br />Line2</p>'), r.html);
  check('html: blank line -> new <p>', r.html.includes('<p>Para2</p>'), r.html);
  check('text: newlines preserved exactly', r.text === 'Line1\nLine2\n\nPara2', JSON.stringify(r.text));
  check('text: no <br> injected', !r.text.includes('<br'), r.text);
}

// ---------------------------------------------------------------------------
section('5. HTML rendering + escaping (the literal "<br />" bug)');
{
  const r = renderEmailFromForm({
    subject: 'S',
    content: '5 < 10 & "quoted"\nNext <b>line</b>',
    recipientName: null,
  });
  check('generated <br /> is REAL markup', r.html.includes('<br />'), r.html);
  check('generated <br /> is NOT escaped to literal', !r.html.includes('&lt;br /&gt;'), r.html);
  check('user "<" is escaped', r.html.includes('5 &lt; 10'), r.html);
  check('user "&" is escaped', r.html.includes('&amp;'), r.html);
  check('user quote is escaped', r.html.includes('&quot;quoted&quot;'), r.html);
  check("user's <b> tag is escaped (not real markup)", r.html.includes('&lt;b&gt;line&lt;/b&gt;'), r.html);
}

// ---------------------------------------------------------------------------
section('6. Plain-text rendering');
{
  const r = renderEmailFromForm({
    subject: 'S',
    content: 'First line\nSecond line',
    recipientName: 'Amy',
  });
  check('text keeps real \\n', r.text === 'First line\nSecond line', JSON.stringify(r.text));
  check('text has zero "<br" occurrences', !r.text.includes('<br'));
}

// ---------------------------------------------------------------------------
section('7. CRLF (Windows) newline handling');
{
  const r = renderEmailFromForm({
    subject: 'S',
    content: 'A\r\nB\r\n\r\nC',
    recipientName: 'Z',
  });
  check('html: CRLF single break -> <br />', r.html.includes('<p>A<br />B</p>'), r.html);
  check('html: CRLF blank line -> new <p>', r.html.includes('<p>C</p>'), r.html);
  check('text: CRLF normalized to \\n', r.text === 'A\nB\n\nC', JSON.stringify(r.text));
}

// ---------------------------------------------------------------------------
section('8. Configurable fallbacks (env-driven)');
{
  process.env.NAME_FALLBACK_SUBJECT = 'friend';
  process.env.NAME_FALLBACK_BODY = 'valued customer';
  const r = renderEmailFromForm({
    subject: 'Hi {{name}}!',
    content: 'Dear {{name}},',
    recipientName: null,
  });
  check('subject fallback honors env override', r.subject === 'Hi friend!', r.subject);
  check('body fallback honors env override', r.text === 'Dear valued customer,', r.text);
  delete process.env.NAME_FALLBACK_SUBJECT;
  delete process.env.NAME_FALLBACK_BODY;
}

// ---------------------------------------------------------------------------
section('9. Invalid-email filtering (read-only — validation logic unchanged)');
{
  const mk = (email: string, status: ValidationResult['status']): ValidationResult => ({
    rowId: 1, email, name: null, status, reason: '',
  });
  const results = [
    mk('good@a.com', 'VALID'),
    mk('catchall@b.com', 'CATCH_ALL'),
    mk('bad@', 'INVALID_FORMAT'),
    mk('nomx@c.com', 'INVALID_DOMAIN'),
  ];
  const sendable = results.filter((r) => SENDABLE_STATUSES.includes(r.status));
  const skipped = results.filter((r) => !SENDABLE_STATUSES.includes(r.status));
  check('sendable = only VALID + CATCH_ALL', sendable.length === 2, JSON.stringify(sendable.map((r) => r.email)));
  check('invalid addresses filtered out of send', skipped.length === 2, JSON.stringify(skipped.map((r) => r.email)));
  check('counts distinguish sendable vs unusable', sendable.length + skipped.length === results.length);
}

console.log(`\n---------------------------------------------`);
console.log(`RESULTS: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
