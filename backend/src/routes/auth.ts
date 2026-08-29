import { Router } from "express";
import jwt from "jsonwebtoken";
import passport from "../lib/passport";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// GET /api/auth/google - kicks off the real Google consent screen redirect
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

// GET /api/auth/google/callback - Google redirects here with the auth code
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${FRONTEND_URL}?login=failed` }),
  (req, res) => {
    const user = req.user as { name: string; email: string; avatar: string };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "12h" });

    // Hand off to the SPA via a redirect carrying the token + user in the
    // URL - the frontend reads these once on load, stores them, and
    // strips them from the address bar. Simpler than standing up a
    // server-side session store for this assignment's scope.
    const params = new URLSearchParams({
      token,
      user: JSON.stringify(user),
    });
    res.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`);
  }
);

router.get("/auth/me", (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "no token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch {
    res.status(401).json({ error: "invalid token" });
  }
});

export default router;
