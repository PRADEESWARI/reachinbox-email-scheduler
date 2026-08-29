import { prisma } from "../lib/prisma";

/**
 * Real Slack OAuth v2 "Add to Slack" flow (not a manually-pasted webhook).
 *
 * Flow:
 *  1. GET /api/slack/oauth/start -> redirect to slack.com/oauth/v2/authorize
 *     with scope=incoming-webhook
 *  2. User picks a channel on Slack's consent screen, approves
 *  3. Slack redirects back to SLACK_REDIRECT_URI with a `code`
 *  4. Backend exchanges the code for an access token at
 *     https://slack.com/api/oauth.v2.access - the response includes
 *     `incoming_webhook.url`, which is the channel-specific webhook URL,
 *     obtained via OAuth rather than copy-pasted by the user.
 *  5. We store that webhook URL + bot token + team/channel name.
 *
 * Sending a message still uses that webhook URL with a simple POST - this
 * is the standard, real way Slack apps deliver Incoming Webhook messages;
 * the OAuth part is what makes "Connect Slack" a real authorize flow
 * instead of an out-of-band manual paste.
 */

const TENANT_ID = "default"; // single-tenant for this assignment

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || "";
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || "";
const SLACK_REDIRECT_URI =
  process.env.SLACK_REDIRECT_URI || "http://localhost:4000/api/slack/oauth/callback";

export function getSlackAuthorizeUrl(): string {
  const params = new URLSearchParams({
    client_id: SLACK_CLIENT_ID,
    scope: "incoming-webhook",
    redirect_uri: SLACK_REDIRECT_URI,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  team?: { name?: string };
  incoming_webhook?: { url?: string; channel?: string };
  error?: string;
}

export async function exchangeSlackCode(code: string) {
  const params = new URLSearchParams({
    client_id: SLACK_CLIENT_ID,
    client_secret: SLACK_CLIENT_SECRET,
    code,
    redirect_uri: SLACK_REDIRECT_URI,
  });

  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = (await res.json()) as SlackOAuthResponse;

  if (!data.ok || !data.access_token || !data.incoming_webhook?.url) {
    throw new Error(`Slack OAuth exchange failed: ${data.error || "unknown error"}`);
  }

  return prisma.slackConfig.upsert({
    where: { tenantId: TENANT_ID },
    update: {
      accessToken: data.access_token,
      webhookUrl: data.incoming_webhook.url,
      channelName: data.incoming_webhook.channel,
      teamName: data.team?.name,
      connected: true,
    },
    create: {
      tenantId: TENANT_ID,
      accessToken: data.access_token,
      webhookUrl: data.incoming_webhook.url,
      channelName: data.incoming_webhook.channel,
      teamName: data.team?.name,
      connected: true,
    },
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
