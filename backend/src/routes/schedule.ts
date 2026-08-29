import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { enqueueEmailJob } from "../queue/emailQueue";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Parses a CSV/text upload of leads into a de-duplicated list of email
 * addresses. Deliberately lenient - accepts comma, newline, or
 * semicolon-separated addresses, with or without a header row.
 */
function extractEmails(buffer: Buffer): string[] {
  const text = buffer.toString("utf-8");
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  return Array.from(new Set(matches.map((e) => e.toLowerCase())));
}

// POST /api/leads/parse - upload CSV/text, get back parsed email count + list
router.post("/leads/parse", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file is required" });
  const emails = extractEmails(req.file.buffer);
  res.json({ count: emails.length, emails });
});

// GET /api/senders
router.get("/senders", async (_req, res) => {
  const senders = await prisma.sender.findMany({ orderBy: { createdAt: "desc" } });
  res.json(senders);
});

// POST /api/senders - {name, email}
router.post("/senders", async (req, res) => {
  const { name, email } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: "name and email required" });
  const sender = await prisma.sender.upsert({
    where: { email },
    update: { name },
    create: { name, email },
  });
  res.json(sender);
});

/**
 * POST /api/campaigns
 * body: {
 *   subject, body, senderId,
 *   recipients: string[],
 *   startTime: ISO string,
 *   delayMs: number,
 *   hourlyLimit: number
 * }
 *
 * Creates one Campaign row + one ScheduledEmail row per recipient, and
 * enqueues each as its own BullMQ delayed job (staggered by delayMs so
 * they don't all fire at exactly startTime - the per-worker limiter also
 * enforces this globally, this stagger just spreads the DB rows' declared
 * scheduledAt sensibly for the dashboard).
 */
router.post("/campaigns", async (req, res) => {
  const {
    subject,
    body,
    senderId,
    recipients,
    startTime,
    delayMs = 2000,
    hourlyLimit = 200,
  } = req.body || {};

  if (!subject || !body || !senderId || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({
      error: "subject, body, senderId, and a non-empty recipients[] are required",
    });
  }

  const sender = await prisma.sender.findUnique({ where: { id: senderId } });
  if (!sender) return res.status(404).json({ error: "sender not found" });

  const start = startTime ? new Date(startTime) : new Date();

  const campaign = await prisma.campaign.create({
    data: { subject, body, delayMs, hourlyLimit },
  });

  const created = [];
  for (let i = 0; i < recipients.length; i++) {
    const scheduledAt = new Date(start.getTime() + i * delayMs);
    const row = await prisma.scheduledEmail.create({
      data: {
        campaignId: campaign.id,
        senderId: sender.id,
        recipient: recipients[i],
        subject,
        body,
        scheduledAt,
        status: "SCHEDULED",
      },
    });
    await enqueueEmailJob(row.id, scheduledAt);
    created.push(row);
  }

  res.status(201).json({ campaign, scheduledCount: created.length });
});

// GET /api/emails/scheduled?search= - Postgres ILIKE search over
// recipient/subject (see README trade-offs: Elasticsearch was scoped out
// in favor of this for time reasons).
router.get("/emails/scheduled", async (req, res) => {
  const search = (req.query.search as string) || "";
  const rows = await prisma.scheduledEmail.findMany({
    where: {
      status: { in: ["PENDING", "SCHEDULED", "RATE_DELAYED"] },
      ...(search
        ? {
            OR: [
              { recipient: { contains: search, mode: "insensitive" } },
              { subject: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { sender: true },
    orderBy: { scheduledAt: "asc" },
  });
  res.json(rows);
});

// GET /api/emails/sent?search=
router.get("/emails/sent", async (req, res) => {
  const search = (req.query.search as string) || "";
  const rows = await prisma.scheduledEmail.findMany({
    where: {
      status: { in: ["SENT", "FAILED"] },
      ...(search
        ? {
            OR: [
              { recipient: { contains: search, mode: "insensitive" } },
              { subject: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { sender: true },
    orderBy: { sentAt: "desc" },
  });
  res.json(rows);
});

// GET /api/stats - small live-metrics endpoint for the dashboard
router.get("/stats", async (_req, res) => {
  const [sentToday, scheduled, failed] = await Promise.all([
    prisma.scheduledEmail.count({
      where: { status: "SENT", sentAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.scheduledEmail.count({ where: { status: { in: ["SCHEDULED", "RATE_DELAYED", "PENDING"] } } }),
    prisma.scheduledEmail.count({ where: { status: "FAILED" } }),
  ]);
  res.json({ sentToday, scheduled, failed });
});

export default router;
