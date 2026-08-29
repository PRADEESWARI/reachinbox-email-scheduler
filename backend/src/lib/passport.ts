import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

/**
 * Real Google OAuth 2.0 (Authorization Code flow) via passport-google-oauth20.
 *
 * Flow:
 *  1. GET /api/auth/google           -> passport redirects to Google's consent screen
 *  2. Google redirects back to GOOGLE_CALLBACK_URL with an auth code
 *  3. passport exchanges the code server-side for tokens + profile
 *  4. verify() below runs with the Google profile - we don't persist a
 *     User table for this assignment (out of scope), we just pass the
 *     profile through to the route handler, which mints our own JWT.
 *
 * Session-less: we use { session: false } on the routes and pass the
 * profile straight through in the `done()` callback, so no server-side
 * session store is required - the JWT we issue afterwards is what the
 * frontend actually uses for subsequent requests.
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:4000/api/auth/google/callback",
    },
    (_accessToken, _refreshToken, profile, done) => {
      const user = {
        name: profile.displayName,
        email: profile.emails?.[0]?.value || "",
        avatar: profile.photos?.[0]?.value || "",
      };
      done(null, user);
    }
  )
);

export default passport;
