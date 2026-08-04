import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { requireAuth } from '@/lib/requireAuth';
import { campaignStore } from '@/lib/campaignStore';
import { parseUploadedFile, ExcelParseError } from '@/services/excelParser';
import { validateRows } from '@/services/emailValidator';
import {
  MAX_UPLOAD_BYTES,
  getExtension,
  isAllowedUploadExtension,
  resolveSafePath,
  sanitizeFilename,
} from '@/utils/fileUtils';
import { generateId } from '@/utils/asyncUtils';
import { ensureDirectoryExists, getUploadsDir } from '@/utils/runtimePaths';
import type { ValidationOutcome } from '@/types';

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
    campaignStore.create(campaignId, rows);

    const validationResults = await validateRows(rows);
    campaignStore.update(campaignId, { validationResults });

    const invalidRows = validationResults.filter((r) => r.status !== 'VALID' && r.status !== 'CATCH_ALL');
    const validCount = validationResults.length - invalidRows.length;

    const outcome: ValidationOutcome = {
      campaignId,
      summary: {
        total: validationResults.length,
        valid: validCount,
        invalid: invalidRows.length,
      },
      invalidRows,
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
