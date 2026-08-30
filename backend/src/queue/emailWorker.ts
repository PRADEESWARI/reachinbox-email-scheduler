import dotenv from "dotenv";
dotenv.config();

import { Worker, Job } from "bullmq";
import { connection } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { sendEmail } from "../services/mailer";
import { tryConsumeSlot, nextWindowStart } from "../services/rateLimiter";
import { notifyRateLimitHit } from "../services/slack";
import { enqueueEmailJob, EMAIL_QUEUE_NAME, EmailJobData } from "./emailQueue";

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 5;
const MIN_DELAY_MS = Number(process.env.MIN_DELAY_MS_BETWEEN_SENDS) || 2000;

/**
 * Processes one scheduled email:
 *  1. Load the row fresh from DB (source of truth, not the job payload)
 *  2. Skip if it's already SENT - guards against any edge-case re-delivery
 *     (BullMQ delivers each job at-least-once, so this DB check is what
 *     actually makes sending idempotent, not just the jobId dedupe)
 *  3. Try to reserve a rate-limit slot for this sender this hour
 *     - if the limit is hit: push the row into the *next* hour window
 *       (new delayed job, same jobId is already taken so we mint a
 *       "-r{n}" retry suffix... see enqueueEmailJob usage below) and
 *       notify Slack
 *     - if allowed: actually send via Ethereal, mark SENT
 */
async function processJob(job: Job<EmailJobData>) {
  const { scheduledEmailId } = job.data;

  const row = await prisma.scheduledEmail.findUnique({
    where: { id: scheduledEmailId },
    include: { sender: true },
  });

  if (!row) {
    console.warn(`[worker] job for missing row ${scheduledEmailId}, skipping`);
    return;
  }

  if (row.status === "SENT") {
    // Already delivered in a previous attempt - do nothing further.
    return;
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: row.campaignId } });
  const envDefaultLimit = Number(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER) || 200;
  const hourlyLimit = campaign?.hourlyLimit ?? envDefaultLimit;

  const rl = await tryConsumeSlot(row.senderId, hourlyLimit);

  if (!rl.allowed) {
    const nextRun = new Date(nextWindowStart());

    await prisma.scheduledEmail.update({
      where: { id: row.id },
      data: { status: "RATE_DELAYED", scheduledAt: nextRun },
    });

    await notifyRateLimitHit({
      senderEmail: row.sender.email,
      currentCount: rl.currentCount,
      limit: rl.limit,
    });

    // Re-enqueue into the next window. jobId stays the same (row.id), and
    // since the current job is about to complete/be removed, BullMQ allows
    // scheduling a fresh delayed job under that same id again.
    await enqueueEmailJob(row.id, nextRun);
    return;
  }

  try {
    const result = await sendEmail({
      fromName: row.sender.name,
      fromEmail: row.sender.email,
      to: row.recipient,
      subject: row.subject,
      html: row.body,
    });

    await prisma.scheduledEmail.update({
      where: { id: row.id },
      data: { status: "SENT", sentAt: new Date() },
    });

    console.log(
      `[worker] sent ${row.id} to ${row.recipient} - preview: ${result.previewUrl}`
    );
  } catch (err: any) {
    await prisma.scheduledEmail.update({
      where: { id: row.id },
      data: {
        status: "FAILED",
        failReason: String(err?.message || err),
        retryCount: { increment: 1 },
      },
    });
    throw err; // let BullMQ's attempts/backoff retry it
  }
}

export const emailWorker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, processJob, {
  connection,
  concurrency: CONCURRENCY,
  // Global throttle: at most 1 job starts every MIN_DELAY_MS across this
  // worker, regardless of concurrency - this is the "minimum delay between
  // individual email sends" requirement, enforced via BullMQ's own limiter
  // rather than a manual sleep (so it doesn't block the event loop or waste
  // a worker slot sitting in a timeout).
  limiter: { max: 1, duration: MIN_DELAY_MS },
});

emailWorker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

emailWorker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} completed`);
});

console.log(
  `[worker] started - concurrency=${CONCURRENCY}, minDelayMs=${MIN_DELAY_MS}`
);
