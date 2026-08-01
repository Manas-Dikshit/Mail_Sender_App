import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/requireAuth';
import { campaignStore } from '@/lib/campaignStore';
import { resolveSafePath } from '@/utils/fileUtils';
import type { ReportPaths } from '@/types';

const REPORTS_DIR = path.join(process.cwd(), 'reports');

const CONTENT_TYPES: Record<string, string> = {
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  html: 'text/html',
  json: 'application/json',
  log: 'text/plain',
};

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaignId');
  const type = searchParams.get('type') as keyof ReportPaths | null;

  if (!campaignId || !type || !CONTENT_TYPES[type]) {
    return NextResponse.json({ error: 'campaignId and a valid type are required.' }, { status: 400 });
  }

  const campaign = campaignStore.get(campaignId);
  if (!campaign?.reportPaths) {
    return NextResponse.json({ error: 'Report not found for this campaign.' }, { status: 404 });
  }

  const filename = campaign.reportPaths[type];
  let filePath: string;
  try {
    filePath = resolveSafePath(REPORTS_DIR, filename);
  } catch {
    return NextResponse.json({ error: 'Invalid report reference.' }, { status: 400 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Report file no longer exists.' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': CONTENT_TYPES[type],
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
