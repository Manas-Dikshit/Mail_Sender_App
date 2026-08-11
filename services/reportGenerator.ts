import fs from 'fs';
import * as XLSX from 'xlsx';
import type { CampaignSummary, InputRow, ReportPaths, SendResult, ValidationResult } from '@/types';
import { resolveSafePath } from '@/utils/fileUtils';
import { ensureDirectoryExists, getReportsDir } from '@/utils/runtimePaths';

const REPORTS_DIR = getReportsDir();

interface ReportRow {
  rowId: number;
  name: string;
  email: string;
  valid: string;
  sent: string;
  sentAt: string;
  error: string;
  validationStatus: string;
  sendStatus: string;
  attempts: number | string;
}

const SENDABLE_STATUSES = new Set(['VALID', 'CATCH_ALL']);

export interface GenerateReportInput {
  campaignId: string;
  rows: InputRow[];
  validationResults: ValidationResult[];
  sendResults: SendResult[] | null; // null if reporting a validation-only run
}

function ensureReportsDir(): void {
  ensureDirectoryExists(REPORTS_DIR);
}

function buildReportRows(input: GenerateReportInput): ReportRow[] {
  const validationByRow = new Map(input.validationResults.map((v) => [v.rowId, v]));
  const sendByRow = new Map((input.sendResults ?? []).map((s) => [s.rowId, s]));

  return input.rows.map((row) => {
    const validation = validationByRow.get(row.rowId);
    const send = sendByRow.get(row.rowId);
    const validationStatus = validation?.status ?? 'UNKNOWN';
    const sendStatus = send?.sendStatus ?? (input.sendResults ? 'SKIPPED' : 'NOT_ATTEMPTED');
    return {
      rowId: row.rowId,
      name: row.name ?? '',
      email: row.email,
      valid: SENDABLE_STATUSES.has(validationStatus) ? 'Valid' : 'Invalid',
      sent: sendStatus === 'SENT' ? 'Sent' : 'Not Sent',
      sentAt: sendStatus === 'SENT' ? toLocalDateTimeString(send?.timestamp) : '',
      error: send?.error ?? validation?.reason ?? '',
      validationStatus,
      sendStatus,
      attempts: send?.attempts ?? 0,
    };
  });
}

/** Formats an ISO timestamp as an exact local date-time (server system timezone). */
function toLocalDateTimeString(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function computeSummary(sendResults: SendResult[] | null): CampaignSummary {
  if (!sendResults) {
    return { total: 0, sent: 0, failed: 0, skipped: 0 };
  }
  return {
    total: sendResults.length,
    sent: sendResults.filter((r) => r.sendStatus === 'SENT').length,
    failed: sendResults.filter((r) => r.sendStatus === 'FAILED').length,
    skipped: sendResults.filter((r) => r.sendStatus === 'SKIPPED').length,
  };
}

const SHEET_HEADERS = ['Email', 'Valid/Invalid', 'Sent/Not Sent', 'Sent At', 'Error/Reason'];

function toSheetData(rows: ReportRow[]): (string | number)[][] {
  return [
    SHEET_HEADERS,
    ...rows.map((r) => [r.email, r.valid, r.sent, r.sentAt, r.error]),
  ];
}

function buildExcelWorkbook(rows: ReportRow[], summary: CampaignSummary): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  const mainSheet = XLSX.utils.aoa_to_sheet(toSheetData(rows));
  XLSX.utils.book_append_sheet(workbook, mainSheet, 'Main');

  const sent = rows.filter((r) => r.sendStatus === 'SENT');
  const failed = rows.filter((r) => r.sendStatus === 'FAILED');
  const skipped = rows.filter((r) => r.sendStatus === 'SKIPPED' || r.sendStatus === 'NOT_ATTEMPTED');

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(toSheetData(sent)), 'Sent');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(toSheetData(failed)), 'Failed');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(toSheetData(skipped)), 'Skipped');

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Metric', 'Count'],
    ['Total', summary.total],
    ['Sent', summary.sent],
    ['Failed', summary.failed],
    ['Skipped', summary.skipped],
  ]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  return workbook;
}

function toCsv(rows: ReportRow[]): string {
  const escape = (value: string | number) => {
    const str = String(value ?? '');
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const lines = [SHEET_HEADERS.join(',')];
  for (const r of rows) {
    lines.push([r.email, r.valid, r.sent, r.sentAt, r.error].map(escape).join(','));
  }
  return lines.join('\n');
}

function toHtml(rows: ReportRow[], summary: CampaignSummary, campaignId: string): string {
  const rowsHtml = rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.email)}</td><td>${r.valid}</td><td>${r.sent}</td>
        <td>${escapeHtml(r.sentAt)}</td><td>${escapeHtml(r.error)}</td>
      </tr>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Campaign Report — ${campaignId}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #1f2937; }
  table { border-collapse: collapse; width: 100%; margin-top: 16px; }
  th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; font-size: 13px; }
  th { background: #f3f4f6; }
  .summary { display: flex; gap: 24px; margin-top: 12px; }
  .summary div { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 16px; }
</style>
</head>
<body>
  <h1>Campaign Report</h1>
  <p>Campaign ID: ${campaignId}</p>
  <div class="summary">
    <div>Total<br /><strong>${summary.total}</strong></div>
    <div>Sent<br /><strong>${summary.sent}</strong></div>
    <div>Failed<br /><strong>${summary.failed}</strong></div>
    <div>Skipped<br /><strong>${summary.skipped}</strong></div>
  </div>
  <table>
    <thead><tr><th>Email</th><th>Valid/Invalid</th><th>Sent/Not Sent</th><th>Sent At</th><th>Error/Reason</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toWorkflowLog(input: GenerateReportInput, summary: CampaignSummary): string {
  const lines: string[] = [];
  const stamp = () => new Date().toISOString();
  lines.push(`[${stamp()}] Campaign ${input.campaignId} — workflow log`);
  lines.push(`[${stamp()}] Rows loaded: ${input.rows.length}`);
  lines.push(`[${stamp()}] Validation complete: ${input.validationResults.length} unique-checked rows`);
  if (input.sendResults) {
    lines.push(
      `[${stamp()}] Sending complete: total=${summary.total} sent=${summary.sent} failed=${summary.failed} skipped=${summary.skipped}`
    );
  } else {
    lines.push(`[${stamp()}] Sending not yet run for this campaign.`);
  }
  return lines.join('\n') + '\n';
}

export interface ReportOutputs {
  excel: Buffer;
  csv: string;
  html: string;
  json: string;
  log: string;
}

/**
 * Builds every report format IN MEMORY (no filesystem). This is the source of
 * truth used for downloads, so downloads never depend on a writable reports/
 * directory (which can fail on ephemeral/serverless filesystems).
 */
export function buildReportOutputs(input: GenerateReportInput): ReportOutputs {
  const rows = buildReportRows(input);
  const summary = computeSummary(input.sendResults);
  const workbook = buildExcelWorkbook(rows, summary);

  return {
    excel: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer,
    csv: toCsv(rows),
    html: toHtml(rows, summary, input.campaignId),
    json: JSON.stringify({ campaignId: input.campaignId, summary, rows }, null, 2),
    log: toWorkflowLog(input, summary),
  };
}

/**
 * Optionally persists the report artifacts to disk under reports/ for record
 * keeping. Returns the filenames (empty string for any format that could not
 * be written). Never throws — a failure to save to disk must not abort the
 * campaign summary or hide the download buttons.
 */
export function generateReports(input: GenerateReportInput): ReportPaths {
  const names: ReportPaths = {
    excel: `${input.campaignId}.xlsx`,
    csv: `${input.campaignId}.csv`,
    html: `${input.campaignId}.html`,
    json: `${input.campaignId}.json`,
    log: `${input.campaignId}.log`,
  };

  try {
    ensureReportsDir();
  } catch {
    return { excel: '', csv: '', html: '', json: '', log: '' };
  }

  let outputs: ReportOutputs;
  try {
    outputs = buildReportOutputs(input);
  } catch {
    return { excel: '', csv: '', html: '', json: '', log: '' };
  }

  const safeWrite = (key: keyof ReportPaths, data: string | Buffer) => {
    try {
      fs.writeFileSync(resolveSafePath(REPORTS_DIR, names[key]), data);
    } catch {
      names[key] = '';
    }
  };

  safeWrite('excel', outputs.excel);
  safeWrite('csv', outputs.csv);
  safeWrite('html', outputs.html);
  safeWrite('json', outputs.json);
  safeWrite('log', outputs.log);

  return names;
}
