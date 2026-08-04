import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Returns the root directory used for runtime-generated files.
 * - Local/self-hosted: project root (existing behavior)
 * - Serverless (Vercel/AWS Lambda): OS temp directory (writable)
 */
function getRuntimeDataRoot(): string {
  const isServerlessRuntime =
    process.env.VERCEL === '1' ||
    Boolean(process.env.AWS_EXECUTION_ENV) ||
    Boolean(process.env.LAMBDA_TASK_ROOT);

  if (isServerlessRuntime) {
    return path.join(os.tmpdir(), 'internal-bulk-email-sender');
  }

  return process.cwd();
}

export function getUploadsDir(): string {
  return path.join(getRuntimeDataRoot(), 'uploads');
}

export function getReportsDir(): string {
  return path.join(getRuntimeDataRoot(), 'reports');
}

export function ensureDirectoryExists(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}
