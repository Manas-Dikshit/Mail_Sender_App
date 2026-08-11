import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/requireAuth';
import { campaignStore } from '@/lib/campaignStore';
import { buildReportOutputs } from '@/services/reportGenerator';

export const dynamic = 'force-dynamic';

const CONTENT_TYPES: Record<string, string> = {
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  html: 'text/html',
  json: 'application/json',
  log: 'text/plain',
};

const EXTENSIONS: Record<string, string> = {
  excel: 'xlsx',
  csv: 'csv',
  html: 'html',
  json: 'json',
  log: 'log',
};

/**
 * Serves any report format, building it IN MEMORY from the campaign's stored
 * rows/validation/send results. This avoids any dependency on a writable
 * reports/ directory (which can fail on ephemeral or serverless filesystems).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaignId');
  const type = searchParams.get('type') as keyof typeof CONTENT_TYPES | null;

  if (!campaignId || !type || !CONTENT_TYPES[type]) {
    return NextResponse.json({ error: 'campaignId and a valid type are required.' }, { status: 400 });
  }

  const campaign = campaignStore.get(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found. Please upload the file again.' }, { status: 404 });
  }
  if (!campaign.sendResults || !campaign.validationResults) {
    return NextResponse.json(
      { error: 'This campaign has not been sent yet, so no report is available.' },
      { status: 400 }
    );
  }

  let outputs;
  try {
    outputs = buildReportOutputs({
      campaignId,
      rows: campaign.rows ?? [],
      validationResults: campaign.validationResults,
      sendResults: campaign.sendResults,
    });
  } catch {
    return NextResponse.json({ error: 'The report could not be generated.' }, { status: 500 });
  }

  const downloadName = `${campaignId}.${EXTENSIONS[type]}`;
  const body =
    type === 'excel'
      ? outputs.excel
      : Buffer.from(outputs[type as 'csv' | 'html' | 'json' | 'log'], 'utf-8');

  return new NextResponse(body, {
    headers: {
      'Content-Type': CONTENT_TYPES[type],
      'Content-Disposition': `attachment; filename="${downloadName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
