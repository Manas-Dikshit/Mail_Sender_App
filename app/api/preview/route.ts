import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/requireAuth';
import { campaignStore } from '@/lib/campaignStore';
import { renderTemplate, type RenderedEmail } from '@/services/templateService';
import { SENDABLE_STATUSES, type TemplateInfo } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Renders a single personalized preview email from template.html + one
 * selected spreadsheet row, without sending anything. Used by the "Preview
 * Email" button so the operator can verify the exact subject/HTML each
 * recipient would receive.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  let body: { campaignId?: string; rowId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const campaignId = body.campaignId;
  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId is required.' }, { status: 400 });
  }

  const campaign = campaignStore.get(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found. Please upload the file again.' }, { status: 404 });
  }
  if (!campaign.validationResults) {
    return NextResponse.json({ error: 'This campaign has not been validated yet.' }, { status: 400 });
  }

  const template = campaign.template;
  const mapping = campaign.templateMapping;
  if (!template || !mapping) {
    return NextResponse.json({ error: 'No template is available for preview.' }, { status: 400 });
  }

  const sendables = campaign.validationResults.filter((r) => SENDABLE_STATUSES.includes(r.status));
  const recipients = sendables.map((r) => ({ rowId: r.rowId, email: r.email, name: r.name }));

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'There are no valid recipients to preview.' }, { status: 400 });
  }

  const rowByRowId = new Map<number, Record<string, unknown>>(
    campaign.rows.map((r) => [r.rowId, r.raw])
  );

  const chosen = recipients.find((r) => r.rowId === body.rowId) ?? recipients[0];
  const preview: RenderedEmail & { rowId: number; email: string } = {
    rowId: chosen.rowId,
    email: chosen.email,
    ...renderTemplate(template, mapping, rowByRowId.get(chosen.rowId) ?? {}),
  };

  return NextResponse.json({
    template: {
      filename: template.filename,
      title: template.title,
      placeholders: template.placeholders,
    } satisfies TemplateInfo,
    mapping,
    recipients,
    preview,
  });
}
