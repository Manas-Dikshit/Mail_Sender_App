// ---------------------------------------------------------------------------
// Core domain types shared across services, API routes, and components.
// ---------------------------------------------------------------------------

/** A single row read from the uploaded Excel/CSV file, before validation. */
export interface InputRow {
  rowId: number;
  email: string;
  name: string | null;
  /** Any other columns from the original file, preserved but not used. */
  raw: Record<string, unknown>;
}

/** The exact set of validation outcomes the pipeline can produce. */
export type ValidationStatus =
  | 'VALID'
  | 'INVALID_FORMAT'
  | 'INVALID_DOMAIN'
  | 'INVALID_MAILBOX'
  | 'ACCESS_DENIED'
  | 'TEMPORARY_FAILURE'
  | 'UNKNOWN'
  | 'CATCH_ALL';

export const VALIDATION_STAGE_LABELS: Record<ValidationStatus, string> = {
  VALID: 'Valid',
  INVALID_FORMAT: 'Invalid format',
  INVALID_DOMAIN: 'Invalid domain (no MX record)',
  INVALID_MAILBOX: 'Mailbox does not exist',
  ACCESS_DENIED: 'Server refused verification (could not confirm mailbox)',
  TEMPORARY_FAILURE: 'Temporary verification failure (not confirmed invalid)',
  UNKNOWN: 'Could not be determined',
  CATCH_ALL: 'Domain accepts all mail (catch-all)',
};

/** Statuses that are treated as sendable. Catch-all domains are risky but deliverable. */
export const SENDABLE_STATUSES: ValidationStatus[] = ['VALID', 'CATCH_ALL'];

/** Statuses that are definitive validation failures. */
export const HARD_INVALID_STATUSES: ValidationStatus[] = [
  'INVALID_FORMAT',
  'INVALID_DOMAIN',
  'INVALID_MAILBOX',
];

/** Statuses where verification could not confidently determine deliverability. */
export const UNCERTAIN_STATUSES: ValidationStatus[] = ['ACCESS_DENIED', 'TEMPORARY_FAILURE', 'UNKNOWN'];

export interface ValidationResult {
  rowId: number;
  email: string;
  name: string | null;
  status: ValidationStatus;
  reason: string;
}

export interface ValidationSummary {
  total: number;
  valid: number;
  invalid: number;
  uncertain: number;
}

/** Result of the full validate step returned to the client. */
export interface ValidationOutcome {
  campaignId: string;
  summary: ValidationSummary;
  invalidRows: ValidationResult[];
  results: ValidationResult[];
}

export type SendStatus = 'SENT' | 'FAILED' | 'SKIPPED';

export interface SendResult {
  rowId: number;
  email: string;
  name: string | null;
  validationStatus: ValidationStatus;
  sendStatus: SendStatus;
  attempts: number;
  error: string | null;
  timestamp: string;
}

export interface CampaignSummary {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
}

/** Progress event streamed to the client while sending is in progress. */
export interface SendProgressEvent {
  type: 'progress' | 'complete' | 'error';
  currentEmail?: string;
  processed: number;
  remaining: number;
  total: number;
  percentage: number;
  status: string;
  summary?: CampaignSummary;
  reportId?: string;
  message?: string;
}

/** In-memory state for one upload → validate → send cycle. */
export interface CampaignState {
  id: string;
  createdAt: number;
  rows: InputRow[];
  validationResults: ValidationResult[] | null;
  sendResults: SendResult[] | null;
  sending: boolean;
  reportPaths: ReportPaths | null;
}

export interface ReportPaths {
  excel: string;
  csv: string;
  html: string;
  json: string;
  log: string;
}
