import { Router } from "express";
import { connectSlack, disconnectSlack, getSlackConfig } from "../services/slack";

const router = Router();

// POST /api/slack/connect - {webhookUrl}
router.post("/slack/connect", async (req, res) => {
  const { webhookUrl } = req.body || {};
  if (!webhookUrl) return res.status(400).json({ error: "webhookUrl required" });
  const config = await connectSlack(webhookUrl);
  res.json({ connected: true, config });
});

router.post("/slack/disconnect", async (_req, res) => {
  await disconnectSlack();
  res.json({ connected: false });
});

router.get("/slack/status", async (_req, res) => {
  const config = await getSlackConfig();
  res.json({ connected: !!config?.connected });
});

export default router;
