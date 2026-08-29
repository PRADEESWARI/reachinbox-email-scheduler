import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

import { emailQueue } from "./queue/emailQueue";
import { recoverUnfinishedJobs } from "./bootstrap/recoverJobs";
import passport from "./lib/passport";
import scheduleRoutes from "./routes/schedule";
import authRoutes from "./routes/auth";
import slackRoutes from "./routes/slack";

const PORT = Number(process.env.PORT) || 4000;

async function main() {
  // Restart-safety: reconcile DB <-> Redis before we accept any traffic.
  await recoverUnfinishedJobs();

  const app = express();
  app.use(cors());
  app.use(express.json());
  // Required before passport.authenticate() can be used in any route -
  // without this, hitting /api/auth/google throws "passport.initialize()
  // middleware not in use" and can crash the process.
  app.use(passport.initialize());

  // Live BullMQ dashboard - required by the assignment ("expose a live
  // BullMQ dashboard for real-time queue visibility").
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");
  createBullBoard({
    // Cast: @bull-board/api's BullMQAdapter and this bullmq version have a
    // minor type-only mismatch (Job.progress typing) between package
    // versions; runtime behavior is correct, this only satisfies tsc.
    queues: [new BullMQAdapter(emailQueue) as any],
    serverAdapter,
  });
  app.use("/admin/queues", serverAdapter.getRouter());

  app.use("/api", authRoutes);
  app.use("/api", slackRoutes);
  app.use("/api", scheduleRoutes);

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.listen(PORT, () => {
    console.log(`[server] listening on :${PORT}`);
    console.log(`[server] BullMQ dashboard at http://localhost:${PORT}/admin/queues`);
  });
}

main().catch((err) => {
  console.error("[server] fatal boot error:", err);
  process.exit(1);
});

// Graceful shutdown - let in-flight worker jobs finish rather than killing
// them mid-send (relevant to the worker process; here it's the API's own
// exit path so we don't leave open DB/Redis handles on redeploy/restart).
process.on("SIGTERM", async () => {
  console.log("[server] SIGTERM received, shutting down");
  process.exit(0);
});
