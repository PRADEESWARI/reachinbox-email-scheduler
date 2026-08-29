import { prisma } from "../lib/prisma";
import { emailQueue, enqueueEmailJob } from "../queue/emailQueue";

/**
 * Restart-safety recovery pass.
 *
 * BullMQ jobs already live in Redis, so on a plain process restart (API/
 * worker crash+restart, Redis untouched) already-enqueued delayed jobs
 * fire correctly on their own - nothing needed there.
 *
 * This pass covers the gap: any ScheduledEmail row in Postgres that is
 * *not* SENT but whose BullMQ job is missing from Redis (e.g. the process
 * crashed between "row inserted" and "job enqueued", or Redis itself lost
 * data). For each such row we re-enqueue using the row id as jobId, so if
 * the job actually *does* still exist this is a safe no-op (BullMQ dedupes
 * by jobId) - we never create a duplicate send.
 *
 * Run this once at boot, before the HTTP server starts accepting traffic.
 */
export async function recoverUnfinishedJobs(): Promise<void> {
  const unfinished = await prisma.scheduledEmail.findMany({
    where: {
      status: { in: ["PENDING", "SCHEDULED", "RATE_DELAYED"] },
      sentAt: null,
    },
  });

  if (unfinished.length === 0) {
    console.log("[recovery] no unfinished rows to check");
    return;
  }

  let reenqueued = 0;

  for (const row of unfinished) {
    const existingJob = await emailQueue.getJob(row.id);

    if (existingJob) {
      const state = await existingJob.getState();
      if (state === "completed" || state === "failed") {
        // stale terminal job left behind - fall through and re-enqueue
      } else {
        continue; // still waiting/delayed/active in Redis - leave it alone
      }
    }

    await enqueueEmailJob(row.id, row.scheduledAt);
    await prisma.scheduledEmail.update({
      where: { id: row.id },
      data: { status: "SCHEDULED" },
    });
    reenqueued++;
  }

  console.log(
    `[recovery] checked ${unfinished.length} row(s), re-enqueued ${reenqueued}`
  );
}
