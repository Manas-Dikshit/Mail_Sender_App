import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/requireAuth';
import { campaignStore } from '@/lib/campaignStore';
import { renderHtmlEmail, type RenderedEmail } from '@/services/templateService';
import { SENDABLE_STATUSES } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Renders a single preview email from the operator's pasted HTML message,
 * without sending anything. The subject comes from the HTML <title> and the
 * body is shown with its CSS intact, exactly as each recipient would receive it.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  let body: { campaignId?: string; rowId?: number; htmlContent?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const campaignId = body.campaignId;
  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId is required.' }, { status: 400 });
  }

  const htmlContent = body.htmlContent?.trim() ?? '';
  if (!htmlContent) {
    return NextResponse.json({ error: 'Paste your HTML email message first.' }, { status: 400 });
  }

  const rendered = renderHtmlEmail(htmlContent);
  if (!rendered.subject) {
    return NextResponse.json(
      { error: 'No <title> found in the HTML. The <title> tag is used as the email subject.' },
      { status: 400 }
    );
  }

  const campaign = campaignStore.get(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found. Please upload the file again.' }, { status: 404 });
  }
  if (!campaign.validationResults) {
    return NextResponse.json({ error: 'This campaign has not been validated yet.' }, { status: 400 });
  }

  const sendables = campaign.validationResults.filter((r) => SENDABLE_STATUSES.includes(r.status));
  const recipients = sendables.map((r) => ({ rowId: r.rowId, email: r.email, name: r.name }));

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'There are no valid recipients to preview.' }, { status: 400 });
  }

  const chosen = recipients.find((r) => r.rowId === body.rowId) ?? recipients[0];
  const preview: RenderedEmail & { rowId: number; email: string } = {
    rowId: chosen.rowId,
    email: chosen.email,
    ...rendered,
  };

  return NextResponse.json({
    recipients,
    preview,
  });
}