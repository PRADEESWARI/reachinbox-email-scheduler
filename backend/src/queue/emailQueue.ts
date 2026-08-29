import { Queue } from "bullmq";
import { connection } from "../lib/redis";

export const EMAIL_QUEUE_NAME = "email-send";

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, { connection });

export interface EmailJobData {
  scheduledEmailId: string;
}

/**
 * Enqueues (or re-enqueues) a delayed BullMQ job for a ScheduledEmail row.
 *
 * Idempotency: we use the ScheduledEmail's own DB id as the BullMQ jobId.
 * BullMQ treats add() with an existing jobId as a no-op if that job is
 * still waiting/delayed/active - so if this function is ever called twice
 * for the same row (e.g. during restart recovery racing with a fresh
 * request), we do not get a duplicate job or duplicate send.
 */
export async function enqueueEmailJob(
  scheduledEmailId: string,
  runAt: Date
): Promise<string> {
  const delay = Math.max(0, runAt.getTime() - Date.now());

  const job = await emailQueue.add(
    "send-email",
    { scheduledEmailId } as EmailJobData,
    {
      jobId: scheduledEmailId,
      delay,
      attempts: 4,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 3600 * 24 * 7 }, // keep 7 days for dashboard/search
      removeOnFail: false,
    }
  );
  return job.id as string;
}
