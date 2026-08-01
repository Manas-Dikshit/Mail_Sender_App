import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import type { CampaignSummary, InputRow, ReportPaths, SendResult, ValidationResult } from '@/types';
import { resolveSafePath } from '@/utils/fileUtils';

const REPORTS_DIR = path.join(process.cwd(), 'reports');

interface ReportRow {
  rowId: number;
  name: string;
  email: string;
  validationStatus: string;
  sendStatus: string;
  attempts: number | string;
  error: string;
  timestamp: string;
}

export interface GenerateReportInput {
  campaignId: string;
  rows: InputRow[];
  validationResults: ValidationResult[];
  sendResults: SendResult[] | null; // null if reporting a validation-only run
}

function ensureReportsDir(): void {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

function buildReportRows(input: GenerateReportInput): ReportRow[] {
  const validationByRow = new Map(input.validationResults.map((v) => [v.rowId, v]));
  const sendByRow = new Map((input.sendResults ?? []).map((s) => [s.rowId, s]));

  return input.rows.map((row) => {
    const validation = validationByRow.get(row.rowId);
    const send = sendByRow.get(row.rowId);
    return {
      rowId: row.rowId,
      name: row.name ?? '',
      email: row.email,
      validationStatus: validation?.status ?? 'UNKNOWN',
      sendStatus: send?.sendStatus ?? (input.sendResults ? 'SKIPPED' : 'NOT_ATTEMPTED'),
      attempts: send?.attempts ?? 0,
      error: send?.error ?? validation?.reason ?? '',
      timestamp: send?.timestamp ?? '',
    };
  });
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

const SHEET_HEADERS = [
  'Row ID',
  'Name',
  'Email',
  'Validation Status',
  'Send Status',
  'Attempts',
  'Error',
  'Timestamp',
];

function toSheetData(rows: ReportRow[]): (string | number)[][] {
  return [
    SHEET_HEADERS,
    ...rows.map((r) => [r.rowId, r.name, r.email, r.validationStatus, r.sendStatus, r.attempts, r.error, r.timestamp]),
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
    lines.push(
      [r.rowId, r.name, r.email, r.validationStatus, r.sendStatus, r.attempts, r.error, r.timestamp]
        .map(escape)
        .join(',')
    );
  }
  return lines.join('\n');
}

function toHtml(rows: ReportRow[], summary: CampaignSummary, campaignId: string): string {
  const rowsHtml = rows
    .map(
      (r) => `<tr>
        <td>${r.rowId}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.email)}</td>
        <td>${r.validationStatus}</td><td>${r.sendStatus}</td><td>${r.attempts}</td>
        <td>${escapeHtml(r.error)}</td><td>${r.timestamp}</td>
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
    <thead><tr><th>Row ID</th><th>Name</th><th>Email</th><th>Validation Status</th><th>Send Status</th><th>Attempts</th><th>Error</th><th>Timestamp</th></tr></thead>
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

/** Writes all report artifacts to disk under reports/ and returns their filenames. */
export function generateReports(input: GenerateReportInput): ReportPaths {
  ensureReportsDir();

  const rows = buildReportRows(input);
  const summary = computeSummary(input.sendResults);

  const excelName = `${input.campaignId}.xlsx`;
  const csvName = `${input.campaignId}.csv`;
  const htmlName = `${input.campaignId}.html`;
  const jsonName = `${input.campaignId}.json`;
  const logName = `${input.campaignId}.log`;

  const workbook = buildExcelWorkbook(rows, summary);
  XLSX.writeFile(workbook, resolveSafePath(REPORTS_DIR, excelName));

  fs.writeFileSync(resolveSafePath(REPORTS_DIR, csvName), toCsv(rows), 'utf-8');
  fs.writeFileSync(resolveSafePath(REPORTS_DIR, htmlName), toHtml(rows, summary, input.campaignId), 'utf-8');
  fs.writeFileSync(
    resolveSafePath(REPORTS_DIR, jsonName),
    JSON.stringify({ campaignId: input.campaignId, summary, rows }, null, 2),
    'utf-8'
  );
  fs.writeFileSync(resolveSafePath(REPORTS_DIR, logName), toWorkflowLog(input, summary), 'utf-8');

  return { excel: excelName, csv: csvName, html: htmlName, json: jsonName, log: logName };
}
