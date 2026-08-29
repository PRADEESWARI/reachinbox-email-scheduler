import { Router } from "express";
import {
  getSlackAuthorizeUrl,
  exchangeSlackCode,
  disconnectSlack,
  getSlackConfig,
} from "../services/slack";

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// GET /api/slack/oauth/start - "Connect Slack" button hits this, redirects
// to Slack's real consent/authorize screen.
router.get("/slack/oauth/start", (_req, res) => {
  res.redirect(getSlackAuthorizeUrl());
});

// GET /api/slack/oauth/callback - Slack redirects here with ?code=...
router.get("/slack/oauth/callback", async (req, res) => {
  const code = req.query.code as string | undefined;
  if (!code) {
    return res.redirect(`${FRONTEND_URL}?slack=failed`);
  }

  try {
    await exchangeSlackCode(code);
    res.redirect(`${FRONTEND_URL}?slack=connected`);
  } catch (err) {
    console.error("[slack] oauth exchange failed:", err);
    res.redirect(`${FRONTEND_URL}?slack=failed`);
  }
});

router.post("/slack/disconnect", async (_req, res) => {
  await disconnectSlack();
  res.json({ connected: false });
});

router.get("/slack/status", async (_req, res) => {
  const config = await getSlackConfig();
  res.json({
    connected: !!config?.connected,
    teamName: config?.teamName || null,
    channelName: config?.channelName || null,
  });
});

export default router;
