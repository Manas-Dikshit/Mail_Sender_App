import path from 'path';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_UPLOAD_EXTENSIONS = ['.xlsx', '.csv'];

/**
 * Strips directory components and dangerous characters from a filename.
 * Never trust a filename that came from client input.
 */
export function sanitizeFilename(originalName: string): string {
  const base = path.basename(originalName);
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned || 'upload';
}

export function getExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

export function isAllowedUploadExtension(filename: string): boolean {
  return ALLOWED_UPLOAD_EXTENSIONS.includes(getExtension(filename));
}

/**
 * Resolves a filename against a base directory and guarantees the result
 * stays inside that directory (defends against `../../` path traversal from
 * a manipulated filename or campaign/report id).
 */
export function resolveSafePath(baseDir: string, filename: string): string {
  const safeName = sanitizeFilename(filename);
  const resolvedBase = path.resolve(baseDir);
  const resolvedPath = path.resolve(resolvedBase, safeName);

  if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
    throw new Error('Invalid file path.');
  }

  return resolvedPath;
}
