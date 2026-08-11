import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/requireAuth';
import { campaignStore } from '@/lib/campaignStore';
import { sendMail, verifySmtpConnection } from '@/services/smtpService';
import {
  applyMappingOverrides,
  buildPlaceholderMapping,
  renderEmailFromForm,
  renderTemplate,
  type RenderedEmail,
} from '@/services/templateService';
import { waitForNextSendSlot } from '@/services/rateLimiter';
import { sendWithRetry } from '@/services/retryHelper';
import { generateReports } from '@/services/reportGenerator';
import { SENDABLE_STATUSES, type SendProgressEvent, type SendResult } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  let body: { campaignId?: string; senderName?: string; subject?: string; content?: string; columnMap?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const campaignId = body.campaignId;
  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId is required.' }, { status: 400 });
  }

  const senderName = body.senderName?.trim() ?? '';
  const subject = body.subject?.trim() ?? '';
  const content = body.content?.trim() ?? '';
  const columnMap = body.columnMap ?? {};

  if (!senderName) {
    return NextResponse.json({ error: 'Your name is required to send emails.' }, { status: 400 });
  }

  const campaign = campaignStore.get(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found. Please upload the file again.' }, { status: 404 });
  }
  if (!campaign.validationResults) {
    return NextResponse.json({ error: 'This campaign has not been validated yet.' }, { status: 400 });
  }
  if (campaign.sending) {
    return NextResponse.json({ error: 'Sending is already in progress for this campaign.' }, { status: 409 });
  }

  // Template mode (primary): subject/body come from template.html + the row, so
  // no manual subject/body are needed. The mapping is REcomputed here from the
  // stored headers so the latest auto-matcher is always used, then any user
  // manual column overrides are applied on top. If a required placeholder is
  // still unmapped we refuse to send rather than emit {{PLACEHOLDER}}.
  const template = campaign.template;
  let mapping = campaign.templateMapping;
  if (template && campaign.headers && template.placeholders.length > 0) {
    mapping = buildPlaceholderMapping(template.placeholders, campaign.headers);
    mapping = applyMappingOverrides(mapping, columnMap);
  }
  const canUseTemplate = Boolean(template && mapping && mapping.missing.length === 0);

  if (!canUseTemplate) {
    if (template && mapping && mapping.missing.length > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot send: these template placeholders have no matching spreadsheet column: ' +
            mapping.missing.join(', '),
        },
        { status: 400 }
      );
    }
    // Fallback to the manual compose path when no template is available.
    if (!subject) {
      return NextResponse.json({ error: 'An email subject is required.' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: 'Email content is required.' }, { status: 400 });
    }
  }

  const sendableResults = campaign.validationResults.filter((r) => SENDABLE_STATUSES.includes(r.status));
  const skippedResults = campaign.validationResults.filter((r) => !SENDABLE_STATUSES.includes(r.status));

  if (sendableResults.length === 0) {
    return NextResponse.json({ error: 'There are no valid emails to send to.' }, { status: 400 });
  }

  campaignStore.update(campaignId, { sending: true });

  const encoder = new TextEncoder();
  const total = sendableResults.length;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SendProgressEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };

      const sendResults: SendResult[] = [];

      // Rows that failed validation are recorded as SKIPPED for the report,
      // but no send attempt is made and they don't count toward progress.
      for (const skipped of skippedResults) {
        sendResults.push({
          rowId: skipped.rowId,
          email: skipped.email,
          name: skipped.name,
          validationStatus: skipped.status,
          sendStatus: 'SKIPPED',
          attempts: 0,
          error: 'Not attempted: failed email validation.',
          timestamp: new Date().toISOString(),
        });
      }

      try {
        send({
          type: 'progress',
          processed: 0,
          remaining: total,
          total,
          percentage: 0,
          status: 'Verifying SMTP connection...',
        });
        await verifySmtpConnection();

        const rowByRowId = new Map<number, Record<string, unknown>>(
          campaign.rows.map((r) => [r.rowId, r.raw])
        );

        let processed = 0;
        for (const result of sendableResults) {
          send({
            type: 'progress',
            currentEmail: result.email,
            processed,
            remaining: total - processed,
            total,
            percentage: Math.round((processed / total) * 100),
            status: `Sending to ${result.email}...`,
          });

          // Render this recipient's personalization from the template + this row.
          // Never pass the unrendered template or a shared subject to sendMail.
          const rendered: RenderedEmail = canUseTemplate && template && mapping
            ? renderTemplate(template, mapping, rowByRowId.get(result.rowId) ?? {})
            : renderEmailFromForm({ subject, content, recipientName: result.name });

          const outcome = await sendWithRetry(() =>
            sendMail({
              to: result.email,
              subject: rendered.subject,
              html: rendered.html,
              text: rendered.text,
              fromName: senderName,
            })
          );

          sendResults.push({
            rowId: result.rowId,
            email: result.email,
            name: result.name,
            validationStatus: result.status,
            sendStatus: outcome.success ? 'SENT' : 'FAILED',
            attempts: outcome.attempts,
            error: outcome.finalError,
            timestamp: new Date().toISOString(),
          });

          processed += 1;
          send({
            type: 'progress',
            currentEmail: result.email,
            processed,
            remaining: total - processed,
            total,
            percentage: Math.round((processed / total) * 100),
            status: outcome.success ? `Sent to ${result.email}` : `Failed to send to ${result.email}`,
          });

          if (processed < total) {
            await waitForNextSendSlot();
          }
        }

        const campaignNow = campaignStore.get(campaignId);
        const reportPaths = generateReports({
          campaignId,
          rows: campaignNow?.rows ?? [],
          validationResults: campaignNow?.validationResults ?? [],
          sendResults,
        });

        campaignStore.update(campaignId, { sending: false, sendResults, reportPaths });

        const summary = {
          total: sendResults.length,
          sent: sendResults.filter((r) => r.sendStatus === 'SENT').length,
          failed: sendResults.filter((r) => r.sendStatus === 'FAILED').length,
          skipped: sendResults.filter((r) => r.sendStatus === 'SKIPPED').length,
        };

        send({
          type: 'complete',
          processed: total,
          remaining: 0,
          total,
          percentage: 100,
          status: 'Campaign complete.',
          summary,
          reportId: campaignId,
        });
      } catch (error) {
        campaignStore.update(campaignId, { sending: false });
        const message = error instanceof Error ? error.message : 'Unexpected error while sending.';
        send({
          type: 'error',
          processed: 0,
          remaining: total,
          total,
          percentage: 0,
          status: 'Sending failed.',
          message,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
