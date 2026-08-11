import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { requireAuth } from '@/lib/requireAuth';
import { campaignStore } from '@/lib/campaignStore';
import { parseUploadedFile, ExcelParseError } from '@/services/excelParser';
import { validateRows } from '@/services/emailValidator';
import { buildPlaceholderMapping, loadTemplateHtml } from '@/services/templateService';
import {
  MAX_UPLOAD_BYTES,
  getExtension,
  isAllowedUploadExtension,
  resolveSafePath,
  sanitizeFilename,
} from '@/utils/fileUtils';
import { generateId } from '@/utils/asyncUtils';
import { ensureDirectoryExists, getUploadsDir } from '@/utils/runtimePaths';
import {
  HARD_INVALID_STATUSES,
  SENDABLE_STATUSES,
  UNCERTAIN_STATUSES,
  type ValidationOutcome,
} from '@/types';

const UPLOADS_DIR = getUploadsDir();

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 });
    }

    if (!isAllowedUploadExtension(file.name)) {
      return NextResponse.json(
        { error: 'Only .xlsx and .csv files are supported.' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'The uploaded file is empty.' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File is too large. Maximum size is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extension = getExtension(file.name) as '.xlsx' | '.csv';

    // Persist the original upload temporarily (sanitized name, path-traversal safe).
    ensureDirectoryExists(UPLOADS_DIR);
    const campaignId = generateId('campaign');
    const storedName = `${campaignId}_${sanitizeFilename(file.name)}`;
    fs.writeFileSync(resolveSafePath(UPLOADS_DIR, storedName), buffer);

    const rows = parseUploadedFile(buffer, extension);

    // Column headers are used to map template placeholders to spreadsheet values.
    const headers = Object.keys(rows[0]?.raw ?? {});
    const template = loadTemplateHtml();
    const templateMapping = template ? buildPlaceholderMapping(template.placeholders, headers) : null;

    campaignStore.create(campaignId, rows, { headers, template, templateMapping });

    const validationResults = await validateRows(rows);
    campaignStore.update(campaignId, { validationResults });

    const reviewRows = validationResults.filter((r) => !SENDABLE_STATUSES.includes(r.status));
    const validCount = validationResults.filter((r) => SENDABLE_STATUSES.includes(r.status)).length;
    const hardInvalidCount = validationResults.filter((r) => HARD_INVALID_STATUSES.includes(r.status)).length;
    const uncertainCount = validationResults.filter((r) => UNCERTAIN_STATUSES.includes(r.status)).length;

    const outcome: ValidationOutcome = {
      campaignId,
      summary: {
        total: validationResults.length,
        valid: validCount,
        invalid: hardInvalidCount,
        uncertain: uncertainCount,
      },
      invalidRows: reviewRows,
      results: validationResults,
    };

    return NextResponse.json(outcome);
  } catch (error) {
    if (error instanceof ExcelParseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unexpected error while processing the file.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
