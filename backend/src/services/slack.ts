import { prisma } from "../lib/prisma";

/**
 * Slack integration - webhook based rather than a full OAuth "Add to Slack"
 * app install flow. See README trade-offs: a full OAuth flow needs a
 * registered Slack app + public redirect URL, which isn't practical for an
 * overnight take-home. Incoming Webhooks still deliver a REAL message into
 * the connected Slack channel (this is not a log line / mock), which is
 * the actually-verifiable part of the requirement.
 *
 * "Connect Slack" in the dashboard = user pastes their channel's Incoming
 * Webhook URL, we store it. Disconnect just clears/disables the row.
 */

const TENANT_ID = "default"; // single-tenant for this assignment

export async function connectSlack(webhookUrl: string) {
  return prisma.slackConfig.upsert({
    where: { tenantId: TENANT_ID },
    update: { webhookUrl, connected: true },
    create: { tenantId: TENANT_ID, webhookUrl, connected: true },
  });
}

export async function disconnectSlack() {
  return prisma.slackConfig.updateMany({
    where: { tenantId: TENANT_ID },
    data: { connected: false },
  });
}

export async function getSlackConfig() {
  return prisma.slackConfig.findUnique({ where: { tenantId: TENANT_ID } });
}

export async function notifyRateLimitHit(params: {
  senderEmail: string;
  currentCount: number;
  limit: number;
}) {
  const config = await getSlackConfig();
  if (!config || !config.connected) {
    // Not connected - silently skip, never crash the send pipeline over this.
    return;
  }

  const text = `:warning: *Rate limit hit* for sender \`${params.senderEmail}\` — ${params.currentCount}/${params.limit} emails this hour. Remaining emails are being rescheduled into the next hour window.`;

  try {
    await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    // Slack being down should never take down email sending.
    console.error("[slack] failed to deliver notification:", err);
  }
}
